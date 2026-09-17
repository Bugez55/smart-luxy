// api/capi.js — Facebook Conversions API (côté serveur)
// Envoie les événements directement à Meta depuis le serveur, en plus
// du Pixel navigateur — bypass les bloqueurs de pub et le refus de cookies,
// et surtout : permet d'envoyer "Purchase" au moment de la LIVRAISON réelle
// (pas juste à la commande), pour que Meta optimise sur les vraies ventes.
//
// Toutes les infos personnelles (téléphone, nom) sont hachées en SHA-256
// avant envoi — Meta l'exige, et ça protège aussi la vie privée du client.

import crypto from 'crypto'

const ALLOWED_ORIGIN = 'https://wazyo.vercel.app'
const META_API_VERSION = 'v21.0'
const DZ_COUNTRY_CODE = '213'

function sha256hex(value) {
  return crypto.createHash('sha256').update(value.toLowerCase().replace(/\s+/g, '')).digest('hex')
}

function normalisePhone(raw) {
  let p = (raw || '').replace(/\D/g, '')
  p = p.replace(/^0+/, '')
  if (!p.startsWith(DZ_COUNTRY_CODE)) p = DZ_COUNTRY_CODE + p
  return p
}

function normaliseName(raw) {
  return (raw || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^\p{L}]/gu, '')
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const isAllowedOrigin = origin === ALLOWED_ORIGIN || origin.endsWith('.vercel.app')
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAllowedOrigin) return res.status(403).json({ error: 'Origine non autorisée' })

  const pixelId = process.env.FB_PIXEL_ID
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) {
    return res.status(500).json({ error: 'CAPI non configuré côté serveur' })
  }

  const {
    eventName,       // 'Lead' à la commande, 'Purchase' à la livraison confirmée
    phone,
    firstName,
    lastName,
    city,            // wilaya
    value,           // montant en DA
    contentIds,      // IDs produits
    eventSourceUrl,
    fbc, fbp,        // cookies de tracking Facebook si présents côté client
  } = req.body

  if (!eventName || !phone) {
    return res.status(400).json({ error: 'eventName et phone requis' })
  }
  if (!['Lead', 'Purchase'].includes(eventName)) {
    return res.status(400).json({ error: 'eventName doit être Lead ou Purchase' })
  }

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || undefined
    const userAgent = req.headers['user-agent'] || undefined

    const userData = {
      ph: sha256hex(normalisePhone(phone)),
      country: sha256hex('dz'),
    }
    if (firstName) userData.fn = sha256hex(normaliseName(firstName))
    if (lastName) userData.ln = sha256hex(normaliseName(lastName))
    if (city) userData.ct = sha256hex(normaliseName(city))
    if (fbc) userData.fbc = fbc
    if (fbp) userData.fbp = fbp
    if (ip) userData.client_ip_address = ip
    if (userAgent) userData.client_user_agent = userAgent

    const eventData = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: `${eventName}-${phone}-${Date.now()}`, // déduplication avec le Pixel navigateur
      action_source: 'website',
      user_data: userData,
    }
    if (eventSourceUrl) eventData.event_source_url = eventSourceUrl
    if (value !== undefined) {
      eventData.custom_data = {
        value: Number(value),
        currency: 'DZD',
        ...(contentIds?.length ? { content_ids: contentIds, content_type: 'product' } : {}),
      }
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventData] }),
    })
    const metaJson = await metaRes.json().catch(() => null)

    if (!metaRes.ok) {
      console.error('Erreur Meta CAPI:', JSON.stringify(metaJson))
      return res.status(500).json({ error: metaJson?.error?.message || 'Erreur Meta' })
    }

    return res.status(200).json({ success: true, events_received: metaJson?.events_received })
  } catch (error) {
    console.error('Erreur CAPI:', error)
    return res.status(500).json({ error: error.message })
  }
}
