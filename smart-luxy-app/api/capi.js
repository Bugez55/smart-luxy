
 // api/capi.js — Meta Conversions API côté serveur
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'

const META_API_VERSION = 'v26.0'
const DZ_COUNTRY_CODE = '213'
const PURCHASE_CLAIM_TTL_MS = 5 * 60 * 1000
const LEAD_RATE_LIMIT = 30
const LEAD_RATE_WINDOW_SECONDS = 60

let serverSupabaseClient

function getServerSupabaseClient() {
  if (serverSupabaseClient) return serverSupabaseClient

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) return null

  serverSupabaseClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return serverSupabaseClient
}

function getRequestIp(req) {
  const realIp = req.headers?.['x-real-ip']

  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().slice(0, 100)
  }

  const forwarded = req.headers?.['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 100)
  }

  return String(req.socket?.remoteAddress || 'unknown').slice(0, 100)
}

function sha256hex(value) {
  return crypto
    .createHash('sha256')
    .update(String(value).toLowerCase().replace(/\s+/g, ''))
    .digest('hex')
}

function hashIpForRateLimit(ip) {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) return null

  return crypto
    .createHmac('sha256', secret)
    .update(String(ip || 'unknown'))
    .digest('hex')
}

// Accepte les formats mobiles algériens locaux et internationaux.
// Retourne les chiffres normalisés ou null si le format est invalide.
function normalisePhone(raw) {
  let phone = String(raw || '').replace(/\D/g, '')

  if (phone.startsWith('00')) {
    phone = phone.slice(2)
  }

  if (/^0[567]\d{8}$/.test(phone)) {
    phone = `${DZ_COUNTRY_CODE}${phone.slice(1)}`
  } else if (/^[567]\d{8}$/.test(phone)) {
    phone = `${DZ_COUNTRY_CODE}${phone}`
  }

  return new RegExp(`^${DZ_COUNTRY_CODE}[567]\\d{8}$`).test(phone)
    ? phone
    : null
}

function normaliseName(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '')
}

function normaliseContentIds(items) {
  if (!Array.isArray(items)) return []

  return items
    .slice(0, 100)
    .filter(id => typeof id === 'string' || typeof id === 'number')
    .map(id => String(id).slice(0, 100))
}

async function consumeLeadRateLimit(ip) {
  const client = getServerSupabaseClient()
  const ipHash = hashIpForRateLimit(ip)

  if (!client || !ipHash) {
    throw new Error('Configuration du limiteur partagé indisponible')
  }

  const { data, error } = await client.rpc(
    'consume_meta_capi_lead_rate_limit',
    {
      p_ip_hash: ipHash,
      p_limit: LEAD_RATE_LIMIT,
      p_window_seconds: LEAD_RATE_WINDOW_SECONDS,
    }
  )

  if (error) {
    console.error('Limiteur Meta Lead indisponible:', error.message)
    throw new Error('Limiteur partagé indisponible')
  }

  return data === true
}

async function releasePurchaseClaim(client, orderId, claimAt) {
  const { error } = await client
    .from('orders')
    .update({ purchase_event_claimed_at: null })
    .eq('id', orderId)
    .eq('purchase_event_claimed_at', claimAt)
    .is('purchase_event_sent_at', null)

  if (error) {
    console.error(
      'Impossible de libérer la réservation Purchase:',
      error.message
    )
  }
}

async function claimPurchaseEvent(client, order) {
  const nowMs = Date.now()
  const claimAt = new Date(nowMs).toISOString()

  // Réservation atomique pour empêcher deux envois simultanés.
  const first = await client
    .from('orders')
    .update({ purchase_event_claimed_at: claimAt })
    .eq('id', order.id)
    .is('purchase_event_sent_at', null)
    .is('purchase_event_claimed_at', null)
    .select('id')
    .maybeSingle()

  if (first.error) throw first.error
  if (first.data) return claimAt

  // Une réservation abandonnée peut être reprise après cinq minutes.
  const previousClaim = order.purchase_event_claimed_at
  const previousClaimMs = previousClaim ? Date.parse(previousClaim) : NaN

  if (
    !previousClaim ||
    !Number.isFinite(previousClaimMs) ||
    nowMs - previousClaimMs < PURCHASE_CLAIM_TTL_MS
  ) {
    return null
  }

  // La comparaison avec l'ancienne valeur garantit qu'une seule
  // requête peut récupérer une réservation expirée.
  const retry = await client
    .from('orders')
    .update({ purchase_event_claimed_at: claimAt })
    .eq('id', order.id)
    .eq('purchase_event_claimed_at', previousClaim)
    .is('purchase_event_sent_at', null)
    .select('id')
    .maybeSingle()

  if (retry.error) throw retry.error

  return retry.data ? claimAt : null
}

export default async function handler(req, res) {
  const allowed = applyCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(allowed ? 204 : 403).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!allowed) {
    return res.status(403).json({ error: 'Origine non autorisée' })
  }

  const pixelId = process.env.FB_PIXEL_ID
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    return res.status(500).json({ error: 'CAPI non configuré côté serveur' })
  }

  const body =
    req.body &&
    typeof req.body === 'object' &&
    !Array.isArray(req.body)
      ? req.body
      : null

  if (!body) {
    return res.status(400).json({ error: 'Corps JSON invalide' })
  }

  const eventName = body.eventName
  const eventId = String(body.eventId || '').trim().slice(0, 120)

  if (!['Lead', 'Purchase'].includes(eventName)) {
    return res.status(400).json({
      error: 'eventName doit être Lead ou Purchase',
    })
  }

  // PURCHASE : administrateur authentifié et commande réellement livrée.
  if (eventName === 'Purchase') {
    const auth = await requireAdmin(req, res)
    if (!auth.ok) return auth.response

    const orderId = String(body.orderId || '').trim().toUpperCase()

    if (!/^SL-[A-Z0-9]+$/.test(orderId)) {
      return res.status(400).json({ error: 'orderId invalide' })
    }

    const { data: order, error } = await auth.client
      .from('orders')
      .select(
        'id,nom_client,telephone,wilaya,total,items,fbc,fbp,purchase_event_sent_at,purchase_event_claimed_at'
      )
      .eq('id', orderId)
      .eq('statut', 'delivered')
      .maybeSingle()

    if (error) {
      console.error('Lecture commande Purchase impossible:', error.message)
      return res.status(500).json({
        error: 'Impossible de vérifier la commande',
      })
    }

    if (!order) {
      return res.status(404).json({
        error: 'Commande livrée introuvable',
      })
    }

    if (order.purchase_event_sent_at) {
      return res.status(200).json({
        success: true,
        duplicate: true,
      })
    }

    let claimAt

    try {
      claimAt = await claimPurchaseEvent(auth.client, order)
    } catch (error) {
      console.error('Réservation Purchase impossible:', error.message)
      return res.status(500).json({
        error: 'Impossible de réserver l’envoi Purchase',
      })
    }

    if (!claimAt) {
      const { data: latest, error: latestError } = await auth.client
        .from('orders')
        .select('purchase_event_sent_at')
        .eq('id', order.id)
        .maybeSingle()

      if (!latestError && latest?.purchase_event_sent_at) {
        return res.status(200).json({
          success: true,
          duplicate: true,
        })
      }

      return res.status(409).json({
        error: 'Un événement Purchase est déjà en cours de traitement. Réessaie plus tard.',
      })
    }

    try {
      const result = await sendMetaEvent({
        pixelId,
        accessToken,
        eventName: 'Purchase',

        // Identifiant stable : le navigateur ne peut pas le remplacer.
        eventId: `${order.id}-purchase`,

        phone: order.telephone,
        firstName: order.nom_client?.split(' ')[0],
        lastName: order.nom_client?.split(' ').slice(1).join(' '),
        city: order.wilaya,
        value: order.total,
        contentIds: normaliseContentIds(
          Array.isArray(order.items)
            ? order.items.map(item => item?.id)
            : []
        ),
        eventSourceUrl: process.env.PUBLIC_APP_URL || 'https://wazyo.com',
        fbc: order.fbc,
        fbp: order.fbp,

        // Important : ne pas envoyer l'IP ni le navigateur de l'administrateur.
      })

      const { data: marked, error: markError } = await auth.client
        .from('orders')
        .update({
          purchase_event_sent_at: new Date().toISOString(),
          purchase_event_claimed_at: null,
        })
        .eq('id', order.id)
        .eq('purchase_event_claimed_at', claimAt)
        .is('purchase_event_sent_at', null)
        .select('id')
        .maybeSingle()

      if (markError || !marked) {
        console.error(
          'Meta a reçu Purchase mais le marqueur local n’a pas été confirmé:',
          markError?.message || 'réservation perdue'
        )

        return res.status(200).json({
          ...result,
          warning: 'Événement transmis à Meta, mais le marqueur local doit être vérifié.',
        })
      }

      return res.status(200).json(result)
    } catch (error) {
      await releasePurchaseClaim(auth.client, order.id, claimAt)

      console.error('Erreur CAPI Purchase:', error?.message || error)

      return res.status(502).json({
        error: 'Impossible d’envoyer Purchase à Meta',
      })
    }
  }

  // LEAD : conserve les champs attendus par le frontend actuel.
  const {
    phone,
    firstName,
    lastName,
    city,
    value,
    contentIds,
    eventSourceUrl,
    fbc,
    fbp,
    externalId,
  } = body

  if (typeof phone !== 'string' || !normalisePhone(phone)) {
    return res.status(400).json({
      error: 'Numéro de mobile algérien invalide',
    })
  }

  if (firstName != null && (typeof firstName !== 'string' || firstName.length > 100)) {
    return res.status(400).json({ error: 'firstName invalide' })
  }

  if (lastName != null && (typeof lastName !== 'string' || lastName.length > 100)) {
    return res.status(400).json({ error: 'lastName invalide' })
  }

  if (city != null && (typeof city !== 'string' || city.length > 100)) {
    return res.status(400).json({ error: 'city invalide' })
  }

  if (eventSourceUrl != null && (
    typeof eventSourceUrl !== 'string' || eventSourceUrl.length > 2000
  )) {
    return res.status(400).json({ error: 'eventSourceUrl invalide' })
  }

  if (contentIds != null && (
    !Array.isArray(contentIds) || contentIds.length > 100
  )) {
    return res.status(400).json({ error: 'contentIds invalide' })
  }

  if (value != null && (
    !['number', 'string'].includes(typeof value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )) {
    return res.status(400).json({ error: 'value invalide' })
  }

  const requestIp = getRequestIp(req)

  try {
    const allowedByRateLimit = await consumeLeadRateLimit(requestIp)

    if (!allowedByRateLimit) {
      return res.status(429).json({
        error: 'Trop de requêtes Lead. Réessaie dans une minute.',
      })
    }
  } catch (error) {
    console.error('Limitation Meta Lead indisponible:', error.message)

    return res.status(503).json({
      error: 'Suivi public temporairement indisponible',
    })
  }

  const leadId =
    eventId || `lead-${crypto.randomBytes(12).toString('hex')}`

  try {
    const result = await sendMetaEvent({
      pixelId,
      accessToken,
      eventName: 'Lead',
      eventId: leadId,
      phone,
      firstName,
      lastName,
      city,
      value,
      contentIds: normaliseContentIds(contentIds),
      eventSourceUrl,
      fbc,
      fbp,
      externalId,
      ip: requestIp,
      userAgent: req.headers?.['user-agent'],
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Erreur CAPI Lead:', error?.message || error)

    return res.status(502).json({ error: 'Erreur Meta CAPI' })
  }
}

async function sendMetaEvent({
  pixelId,
  accessToken,
  eventName,
  eventId,
  phone,
  firstName,
  lastName,
  city,
  value,
  contentIds,
  eventSourceUrl,
  fbc,
  fbp,
  externalId,
  ip,
  userAgent,
}) {
  const userData = {
    country: sha256hex('dz'),
  }

  const normalizedPhone = normalisePhone(phone)
  if (normalizedPhone) {
    userData.ph = sha256hex(normalizedPhone)
  }

  if (firstName) userData.fn = sha256hex(normaliseName(firstName))
  if (lastName) userData.ln = sha256hex(normaliseName(lastName))
  if (city) userData.ct = sha256hex(normaliseName(city))

  if (typeof fbc === 'string' && fbc.length <= 500) {
    userData.fbc = fbc
  }

  if (typeof fbp === 'string' && fbp.length <= 500) {
    userData.fbp = fbp
  }

  if (externalId != null && String(externalId).trim() && String(externalId).length <= 500) {
    userData.external_id = sha256hex(String(externalId))
  }

  if (typeof ip === 'string' && ip.length <= 100) {
    userData.client_ip_address = ip
  }

  if (typeof userAgent === 'string' && userAgent.length <= 1000) {
    userData.client_user_agent = userAgent
  }

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    user_data: userData,
  }

  if (eventSourceUrl) {
    eventData.event_source_url = String(eventSourceUrl).slice(0, 2000)
  }

  if (
    value !== undefined &&
    value !== null &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  ) {
    const safeContentIds = normaliseContentIds(contentIds)

    eventData.custom_data = {
      value: Number(value),
      currency: 'DZD',
      ...(safeContentIds.length
        ? {
            content_ids: safeContentIds,
            content_type: 'product',
          }
        : {}),
    }
  }

  const url =
    `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(pixelId)}/events` +
    `?access_token=${encodeURIComponent(accessToken)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  let metaRes
  let metaJson

  try {
    metaRes = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventData] }),
    })

    metaJson = await metaRes.json().catch(() => null)
  } finally {
    clearTimeout(timeout)
  }

  if (!metaRes.ok) {
    console.error('Erreur Meta CAPI:', JSON.stringify(metaJson))

    throw new Error(metaJson?.error?.message || `Meta HTTP ${metaRes.status}`)
  }

  return {
    success: true,
    events_received: metaJson?.events_received,
  }
}
