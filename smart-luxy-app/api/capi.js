// api/capi.js — Facebook Conversions API côté serveur
import crypto from 'crypto'
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'

const META_API_VERSION = 'v21.0'
const DZ_COUNTRY_CODE = '213'

function sha256hex(value) {
  return crypto
    .createHash('sha256')
    .update(String(value).toLowerCase().replace(/\s+/g, ''))
    .digest('hex')
}

function normalisePhone(raw) {
  let p = String(raw || '').replace(/\D/g, '')
  p = p.replace(/^0+/, '')
  if (!p.startsWith(DZ_COUNTRY_CODE)) p = DZ_COUNTRY_CODE + p
  return p
}

function normaliseName(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '')
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
    return res.status(500).json({
      error: 'CAPI non configuré côté serveur',
    })
  }

  const body = req.body || {}

  const eventName = body.eventName
  const eventId = String(body.eventId || '').trim().slice(0, 120)

  if (!['Lead', 'Purchase'].includes(eventName)) {
    return res.status(400).json({
      error: 'eventName doit être Lead ou Purchase',
    })
  }

  // ============================================================
  // PURCHASE
  // ============================================================
  if (eventName === 'Purchase') {
    const auth = await requireAdmin(req, res)

    if (!auth.ok) {
      return auth.response
    }

    const orderId = String(body.orderId || '')
      .trim()
      .toUpperCase()

    if (!orderId || !/^SL-[A-Z0-9]+$/.test(orderId)) {
      return res.status(400).json({
        error: 'orderId invalide',
      })
    }

    const { data: order, error } = await auth.client
      .from('orders')
      .select(
        'id,nom_client,telephone,wilaya,total,items,status:statut,fbc,fbp,purchase_event_sent_at'
      )
      .eq('id', orderId)
      .eq('statut', 'delivered')
      .maybeSingle()

    if (error || !order) {
      return res.status(404).json({
        error: 'Commande livrée introuvable',
      })
    }

    // Protection contre les doublons.
    if (order.purchase_event_sent_at) {
      return res.status(200).json({
        success: true,
        duplicate: true,
      })
    }

    const purchaseId = `${order.id}-purchase`
    const bodyEventId = eventId || purchaseId

    const result = await sendMetaEvent({
      pixelId,
      accessToken,
      eventName: 'Purchase',
      eventId: bodyEventId,

      phone: order.telephone,

      firstName: order.nom_client?.split(' ')[0],

      lastName: order.nom_client
        ?.split(' ')
        .slice(1)
        .join(' '),

      city: order.wilaya,

      value: order.total,

      contentIds: Array.isArray(order.items)
        ? order.items.map(i => i.id)
        : [],

      eventSourceUrl:
        process.env.PUBLIC_APP_URL || 'https://wazyo.com',

      fbc: order.fbc,
      fbp: order.fbp,

      ip:
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress,

      userAgent: req.headers['user-agent'],
    })

    // On marque l'événement comme envoyé uniquement après
    // une réponse Meta réussie.
    const { error: markError } = await auth.client
      .from('orders')
      .update({
        purchase_event_sent_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .is('purchase_event_sent_at', null)

    if (markError) {
      console.error(
        'Impossible de marquer Purchase comme envoyé:',
        markError
      )
    }

    return res.status(200).json(result)
  }

  // ============================================================
  // LEAD
  // ============================================================
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

  if (!phone) {
    return res.status(400).json({
      error: 'phone requis',
    })
  }

  const leadId =
    eventId ||
    `lead-${crypto.randomBytes(12).toString('hex')}`

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
      contentIds,
      eventSourceUrl,
      fbc,
      fbp,

      // Un external_id pourra être ajouté plus tard si un identifiant
      // client stable est réellement stocké côté base.
      externalId,

      ip:
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress,

      userAgent: req.headers['user-agent'],
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Erreur CAPI Lead:', error)

    return res.status(500).json({
      error: 'Erreur Meta CAPI',
    })
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
    ph: sha256hex(normalisePhone(phone)),
    country: sha256hex('dz'),
  }

  if (firstName) {
    userData.fn = sha256hex(normaliseName(firstName))
  }

  if (lastName) {
    userData.ln = sha256hex(normaliseName(lastName))
  }

  if (city) {
    userData.ct = sha256hex(normaliseName(city))
  }

  if (fbc) {
    userData.fbc = String(fbc).slice(0, 500)
  }

  if (fbp) {
    userData.fbp = String(fbp).slice(0, 500)
  }

  // Nouveau : identifiant externe stable du client.
  if (externalId) {
    userData.external_id = String(externalId).slice(0, 500)
  }

  if (ip) {
    userData.client_ip_address = ip
  }

  if (userAgent) {
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
    eventData.event_source_url = String(eventSourceUrl).slice(
      0,
      2000
    )
  }

  if (
    value !== undefined &&
    Number.isFinite(Number(value))
  ) {
    eventData.custom_data = {
      value: Number(value),
      currency: 'DZD',

      ...(Array.isArray(contentIds) && contentIds.length
        ? {
            content_ids: contentIds,
            content_type: 'product',
          }
        : {}),
    }
  }

  const url =
    `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events` +
    `?access_token=${encodeURIComponent(accessToken)}`

  const metaRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [eventData],
    }),
  })

  const metaJson = await metaRes.json().catch(() => null)

  if (!metaRes.ok) {
    console.error(
      'Erreur Meta CAPI:',
      JSON.stringify(metaJson)
    )

    throw new Error(
      metaJson?.error?.message || 'Erreur Meta'
    )
  }

  return {
    success: true,
    events_received: metaJson?.events_received,
  }
}
