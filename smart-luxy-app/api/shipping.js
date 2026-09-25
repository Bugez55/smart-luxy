// api/shipping.js — intégration serveur Yalidine
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'

const CLAIM_TTL_MS = 10 * 60 * 1000

async function getDispatch(client, orderId) {
  const { data, error } = await client
    .from('shipping_dispatches')
    .select('id,provider,order_id,status,attempts,tracking_code,label_url,last_error,created_at,updated_at')
    .eq('provider', 'yalidine')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function reconcileOrder(client, orderId, tracking) {
  const { data: current, error: readError } = await client
    .from('orders')
    .select('id,statut,tracking_code,livraison_company')
    .eq('id', orderId)
    .maybeSingle()

  if (readError || !current) {
    return { ok: false, error: readError?.message || 'Commande introuvable' }
  }

  const trackingCode = String(tracking)

  if (current.tracking_code && String(current.tracking_code) !== trackingCode) {
    return { ok: false, conflict: true, error: 'La commande possède déjà un autre tracking.' }
  }

  if (current.statut === 'cancelled') {
    return { ok: false, conflict: true, error: 'La commande a été annulée.' }
  }

  const updates = {
    tracking_code: trackingCode,
    livraison_company: 'yalidine',
  }

  if (current.statut === 'new' || current.statut === 'confirmed') {
    updates.statut = 'shipped'
  }

  const { error: updateError } = await client
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  if (updateError) return { ok: false, error: updateError.message }
  return { ok: true }
}

async function markUnknown(client, dispatch, message) {
  if (!dispatch) return
  await client
    .from('shipping_dispatches')
    .update({ status: 'unknown', last_error: String(message || '').slice(0, 1000) })
    .eq('id', dispatch.id)
}

export default async function handler(req, res) {
  const allowed = applyCors(req, res)

  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end()
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

  let dispatch
  try {
    dispatch = await getDispatch(auth.client, orderId)
  } catch (error) {
    console.error('Erreur lecture shipping_dispatches:', error)
    return res.status(500).json({ error: 'Impossible de vérifier l’état de l’expédition.' })
  }

  // Already created: never call Yalidine again. Reconcile Wazyo if necessary.
  if (dispatch?.status === 'created' && dispatch.tracking_code) {
    const reconciled = await reconcileOrder(auth.client, orderId, dispatch.tracking_code)
    if (!reconciled.ok) {
      return res.status(reconciled.conflict ? 409 : 500).json({
        error: reconciled.error || 'Le suivi existe mais la commande n’a pas pu être synchronisée.',
        tracking: dispatch.tracking_code,
      })
    }

    return res.status(200).json({
      success: true,
      idempotent: true,
      tracking: dispatch.tracking_code,
      label_url: dispatch.label_url || null,
    })
  }

  // An in-flight/unknown external call must not be retried automatically:
  // the provider may already have created a parcel and a second POST could duplicate it.
  if (dispatch?.status === 'creating') {
    const age = Date.now() - new Date(dispatch.updated_at).getTime()
    if (Number.isFinite(age) && age < CLAIM_TTL_MS) {
      return res.status(409).json({ error: 'Une expédition Yalidine est déjà en cours pour cette commande.' })
    }

    await markUnknown(auth.client, dispatch, 'Tentative Yalidine devenue incertaine après délai. Vérification manuelle requise avant tout nouvel envoi.')
    return res.status(409).json({
      error: 'L’expédition précédente est incertaine. Vérifie Yalidine avant de relancer pour éviter un doublon.',
    })
  }

  if (dispatch?.status === 'unknown') {
    return res.status(409).json({
      error: 'L’expédition Yalidine est dans un état incertain. Vérifie Yalidine avant de relancer.',
    })
  }

  // Query the order only when we are actually allowed to create a first/retry attempt.
  const { data: order, error } = await auth.client
    .from('orders')
    .select('id,nom_client,telephone,wilaya,commune,adresse,total,frais_livraison,mode_livraison,items,statut')
    .eq('id', orderId)
    .in('statut', ['new', 'confirmed'])
    .maybeSingle()

  if (error || !order) {
    return res.status(404).json({ error: 'Commande introuvable ou déjà expédiée' })
  }

  // Claim this order/provider pair durably before the external side effect.
  try {
    if (dispatch?.status === 'failed') {
      const { data: claimed, error: claimError } = await auth.client
        .from('shipping_dispatches')
        .update({
          status: 'creating',
          attempts: Number(dispatch.attempts || 1) + 1,
          last_error: null,
        })
        .eq('id', dispatch.id)
        .eq('status', 'failed')
        .select('id,status,attempts,updated_at')
        .maybeSingle()

      if (claimError || !claimed) {
        return res.status(409).json({ error: 'Une autre tentative d’expédition est déjà en cours.' })
      }
      dispatch = { ...dispatch, ...claimed, status: 'creating' }
    } else {
      const { data: created, error: createError } = await auth.client
        .from('shipping_dispatches')
        .insert({ provider: 'yalidine', order_id: order.id, status: 'creating', attempts: 1 })
        .select('id,provider,order_id,status,attempts,tracking_code,label_url,last_error,created_at,updated_at')
        .single()

      if (createError) {
        if (createError.code === '23505') {
          const latest = await getDispatch(auth.client, orderId)
          if (latest?.status === 'created' && latest.tracking_code) {
            const reconciled = await reconcileOrder(auth.client, orderId, latest.tracking_code)
            if (!reconciled.ok) {
              return res.status(reconciled.conflict ? 409 : 500).json({ error: reconciled.error, tracking: latest.tracking_code })
            }
            return res.status(200).json({ success: true, idempotent: true, tracking: latest.tracking_code, label_url: latest.label_url || null })
          }
          return res.status(409).json({ error: 'Une autre tentative d’expédition est déjà en cours.' })
        }
        console.error('Erreur création shipping_dispatch:', createError)
        return res.status(500).json({ error: 'Impossible de verrouiller l’expédition.' })
      }
      dispatch = created
    }
  } catch (error) {
    console.error('Erreur verrouillage expédition:', error)
    return res.status(500).json({ error: 'Impossible de verrouiller l’expédition.' })
  }

  const items = Array.isArray(order.items) ? order.items : []
  const description = items.map(i => `${i.nom} x${i.qty}`).join(', ')
  const wilayaId = String(order.wilaya || '').match(/^\d+/)?.[0] || ''

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch('https://api.yalidine.app/v1/parcels/', {
      method: 'POST',
      signal: controller.signal,
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
      const providerMessage = data?.message || data?.detail || 'Yalidine a refusé la création du colis'
      if (response.status >= 500) {
        await markUnknown(auth.client, dispatch, `Réponse Yalidine ${response.status}: ${providerMessage}`)
        return res.status(502).json({ error: 'Réponse serveur Yalidine incertaine. Vérifie le portail Yalidine avant de relancer.' })
      }

      await auth.client
        .from('shipping_dispatches')
        .update({ status: 'failed', last_error: String(providerMessage).slice(0, 1000) })
        .eq('id', dispatch.id)

      return res.status(502).json({ error: providerMessage })
    }

    if (!data?.tracking) {
      await markUnknown(auth.client, dispatch, 'Réponse Yalidine sans numéro de tracking.')
      return res.status(502).json({ error: 'Réponse Yalidine sans numéro de tracking. Vérification manuelle requise.' })
    }

    const tracking = String(data.tracking)
    const labelUrl = data.label_url ? String(data.label_url) : null

    const { error: dispatchUpdateError } = await auth.client
      .from('shipping_dispatches')
      .update({
        status: 'created',
        tracking_code: tracking,
        label_url: labelUrl,
        last_error: null,
      })
      .eq('id', dispatch.id)

    if (dispatchUpdateError) {
      console.error('Erreur enregistrement tracking Yalidine:', dispatchUpdateError)
      return res.status(500).json({
        error: 'Colis créé chez Yalidine mais le suivi n’a pas pu être enregistré. Ne relance pas l’envoi avant vérification.',
        tracking,
      })
    }

    const reconciled = await reconcileOrder(auth.client, order.id, tracking)
    if (!reconciled.ok) {
      console.error('Erreur synchronisation commande après Yalidine:', reconciled.error)
      return res.status(500).json({
        error: reconciled.conflict
          ? reconciled.error
          : 'Colis créé et suivi enregistré, mais la commande n’a pas pu être synchronisée.',
        tracking,
      })
    }

    return res.status(200).json({
      success: true,
      tracking,
      label_url: labelUrl,
    })
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Délai dépassé vers Yalidine' : (error?.message || 'Erreur réseau Yalidine')
    console.error('Erreur Yalidine:', error)
    await markUnknown(auth.client, dispatch, message)
    return res.status(502).json({
      error: 'La tentative Yalidine est incertaine. Vérifie Yalidine avant de relancer pour éviter un doublon.',
    })
  } finally {
    clearTimeout(timeout)
  }
}
