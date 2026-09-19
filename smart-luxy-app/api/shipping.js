// api/shipping.js — intégration serveur Yalidine
import { requireAdmin } from './_auth.js'

const ALLOWED_ORIGINS = [
  'https://wazyo.com',
  'https://www.wazyo.com',
  'https://wazyo.vercel.app',
]

function isAllowedOrigin(origin) {
  return !!origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
  )
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowed = isAllowedOrigin(origin)
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0])
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!allowed) return res.status(403).json({ error: 'Origine non autorisée' })

  const auth = await requireAdmin(req, res)
  if (!auth.ok) return auth.response

  const provider = String(req.body?.provider || '').toLowerCase()
  const orderId = String(req.body?.orderId || '').trim().toUpperCase()

  if (provider !== 'yalidine') {
    return res.status(400).json({ error: 'Fournisseur non supporté' })
  }
  if (!/^SL-[A-Z0-9]+$/.test(orderId)) {
    return res.status(400).json({ error: 'Commande invalide' })
  }

  const apiId = process.env.YALIDINE_API_ID
  const apiToken = process.env.YALIDINE_API_TOKEN
  if (!apiId || !apiToken) {
    return res.status(500).json({
      error: 'Yalidine n’est pas configuré côté serveur. Ajoute YALIDINE_API_ID et YALIDINE_API_TOKEN dans Vercel.',
    })
  }

  const { data: order, error } = await auth.client
    .from('orders')
    .select('id,nom_client,telephone,wilaya,commune,adresse,total,frais_livraison,mode_livraison,items,statut')
    .eq('id', orderId)
    .in('statut', ['new', 'confirmed'])
    .maybeSingle()

  if (error || !order) {
    return res.status(404).json({ error: 'Commande introuvable ou déjà expédiée' })
  }

  const items = Array.isArray(order.items) ? order.items : []
  const description = items.map(i => `${i.nom} x${i.qty}`).join(', ')
  const wilayaId = String(order.wilaya || '').match(/^\d+/)?.[0] || ''

  try {
    const response = await fetch('https://api.yalidine.app/v1/parcels/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
      },
      body: JSON.stringify({
        order_id: order.id,
        firstname: order.nom_client?.split(' ')[0] || order.nom_client,
        familyname: order.nom_client?.split(' ').slice(1).join(' ') || '',
        contact_phone: order.telephone?.replace(/^0/, '213'),
        address: order.adresse || order.commune || '',
        to_wilaya_id: Number(wilayaId) || 0,
        to_commune_id: 0,
        product_list: description.slice(0, 500),
        price: Number(order.total),
        do_insurance: 0,
        declared_value: 0,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        freeshipping: Number(order.frais_livraison || 0) === 0 ? 1 : 0,
        is_stopdesk: order.mode_livraison === 'bureau' ? 1 : 0,
        has_exchange: 0,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(502).json({
        error: data?.message || data?.detail || 'Yalidine a refusé la création du colis',
      })
    }

    if (!data?.tracking) {
      return res.status(502).json({ error: 'Réponse Yalidine sans numéro de tracking' })
    }

    const { error: updateError } = await auth.client
      .from('orders')
      .update({
        statut: 'shipped',
        tracking_code: String(data.tracking),
        livraison_company: 'yalidine',
      })
      .eq('id', order.id)
      .in('statut', ['new', 'confirmed'])

    if (updateError) {
      console.error('Erreur mise à jour commande après Yalidine:', updateError)
      return res.status(500).json({ error: 'Colis créé mais commande non mise à jour' })
    }

    return res.status(200).json({
      success: true,
      tracking: data.tracking,
      label_url: data.label_url || null,
    })
  } catch (error) {
    console.error('Erreur Yalidine:', error)
    return res.status(502).json({ error: 'Erreur réseau Yalidine' })
  }
}
