
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
  const trackingCode = String(tracking || '').trim()

  if (!trackingCode) {
    return { ok: false, error: 'Numéro de suivi manquant.' }
  }

  const { data, error } = await client.rpc('reconcile_yalidine_order', {
    p_order_id: String(orderId).trim().toUpperCase(),
    p_tracking_code: trackingCode,
  })

  if (error) {
    console.error('Erreur synchronisation commande:', error.message)
    return {
      ok: false,
      error: 'Impossible de synchroniser la commande.',
    }
  }

  if (!data || data.ok !== true) {
    return {
      ok: false,
      conflict: data?.conflict === true,
      error: data?.error || 'La commande n’a pas pu être synchronisée.',
    }
  }

  return { ok: true }
}

async function markUnknown(client, dispatch, message) {
  if (!dispatch) return

  const { error } = await client
    .from('shipping_dispatches')
    .update({
      status: 'unknown',
      last_error: String(message || '').slice(0, 1000),
    })
    .eq('id', dispatch.id)

  if (error) {
    console.error('Erreur mise à jour expédition incertaine:', error.message)
  }
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
    return res.status(500).json({
      error: 'Impossible de vérifier l’état de l’expédition.',
    })
  }

  // Si le colis existe déjà, ne jamais le recréer.
  if (dispatch?.status === 'created' && dispatch.tracking_code) {
    const reconciled = await reconcileOrder(
      auth.client,
      orderId,
      dispatch.tracking_code
    )

    if (!reconciled.ok) {
      return res.status(reconciled.conflict ? 409 : 500).json({
        error: reconciled.error,
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

  // Ne pas relancer automatiquement une tentative incertaine.
  if (dispatch?.status === 'creating') {
    const age = Date.now() - new Date(dispatch.updated_at).getTime()

    if (Number.isFinite(age) && age < CLAIM_TTL_MS) {
      return res.status(409).json({
        error: 'Une expédition Yalidine est déjà en cours pour cette commande.',
      })
    }

    await markUnknown(
      auth.client,
      dispatch,
      'Tentative Yalidine devenue incertaine après délai. Vérification manuelle requise.'
    )

    return res.status(409).json({
      error: 'L’expédition précédente est incertaine. Vérifie Yalidine avant de relancer pour éviter un doublon.',
    })
  }

  if (dispatch?.status === 'unknown') {
    return res.status(409).json({
      error: 'L’expédition Yalidine est dans un état incertain. Vérifie Yalidine avant de relancer.',
    })
  }

  // Une commande annulée ou déjà expédiée ne doit pas être envoyée à nouveau.
  const { data: order, error: orderError } = await auth.client
    .from('orders')
    .select('id,nom_client,telephone,wilaya,commune,adresse,total,frais_livraison,mode_livraison,items,statut')
    .eq('id', orderId)
    .in('statut', ['new', 'confirmed'])
    .maybeSingle()

  if (orderError) {
    console.error('Erreur lecture commande:', orderError.message)
    return res.status(500).json({
      error: 'Impossible de vérifier la commande.',
    })
  }

  if (!order) {
    return res.status(404).json({
      error: 'Commande introuvable, annulée ou déjà expédiée.',
    })
  }

  // Réserver l'expédition en base avant l'appel externe.
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
        return res.status(409).json({
          error: 'Une autre tentative d’expédition est déjà en cours.',
        })
      }

      dispatch = { ...dispatch, ...claimed, status: 'creating' }
    } else {
      const { data: created, error: createError } = await auth.client
        .from('shipping_dispatches')
        .insert({
          provider: 'yalidine',
          order_id: order.id,
          status: 'creating',
          attempts: 1,
        })
        .select('id,provider,order_id,status,attempts,tracking_code,label_url,last_error,created_at,updated_at')
        .single()

      if (createError) {
        if (createError.code === '23505') {
          const latest = await getDispatch(auth.client, orderId)

          if (latest?.status === 'created' && latest.tracking_code) {
            const reconciled = await reconcileOrder(
              auth.client,
              orderId,
              latest.tracking_code
            )

            if (!reconciled.ok) {
              return res.status(reconciled.conflict ? 409 : 500).json({
                error: reconciled.error,
                tracking: latest.tracking_code,
              })
            }

            return res.status(200).json({
              success: true,
              idempotent: true,
              tracking: latest.tracking_code,
              label_url: latest.label_url || null,
            })
          }

          return res.status(409).json({
            error: 'Une autre tentative d’expédition est déjà en cours.',
          })
        }

        console.error('Erreur création shipping_dispatch:', createError)

        return res.status(500).json({
          error: 'Impossible de verrouiller l’expédition.',
        })
      }

      dispatch = created
    }
  } catch (error) {
    console.error('Erreur verrouillage expédition:', error)

    return res.status(500).json({
      error: 'Impossible de verrouiller l’expédition.',
    })
  }

  const items = Array.isArray(order.items) ? order.items : []
  const description = items
    .map((item) => `${item.nom || 'Produit'} x${item.qty || 1}`)
    .join(', ')

  const wilayaId =
    String(order.wilaya || '').match(/^\d+/)?.[0] || ''

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
      const providerMessage =
        data?.message ||
        data?.detail ||
        'Yalidine a refusé la création du colis'

      // Une réponse serveur peut laisser planer un doute sur la création.
      if (response.status >= 500) {
        await markUnknown(
          auth.client,
          dispatch,
          `Réponse Yalidine ${response.status}: ${providerMessage}`
        )

        return res.status(502).json({
          error: 'Réponse serveur Yalidine incertaine. Vérifie le portail Yalidine avant de relancer.',
        })
      }

      const { error: updateError } = await auth.client
        .from('shipping_dispatches')
        .update({
          status: 'failed',
          last_error: String(providerMessage).slice(0, 1000),
        })
        .eq('id', dispatch.id)

      if (updateError) {
        console.error('Erreur sauvegarde échec expédition:', updateError.message)
      }

      return res.status(502).json({ error: providerMessage })
    }

    if (!data?.tracking) {
      await markUnknown(
        auth.client,
        dispatch,
        'Réponse Yalidine sans numéro de tracking.'
      )

      return res.status(502).json({
        error: 'Réponse Yalidine sans numéro de tracking. Vérification manuelle requise.',
      })
    }

    const tracking = String(data.tracking).trim()
    const labelUrl = data.label_url ? String(data.label_url) : null

    // Sauvegarder le numéro de suivi avant la réconciliation de commande.
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
      console.error(
        'Erreur enregistrement tracking Yalidine:',
        dispatchUpdateError
      )

      return res.status(500).json({
        error: 'Colis créé chez Yalidine mais le suivi n’a pas pu être enregistré. Ne relance pas l’envoi avant vérification.',
        tracking,
      })
    }

    const reconciled = await reconcileOrder(
      auth.client,
      order.id,
      tracking
    )

    if (!reconciled.ok) {
      console.error(
        'Erreur synchronisation commande après Yalidine:',
        reconciled.error
      )

      return res.status(500).json({
        error: reconciled.error ||
          'Colis créé et suivi enregistré, mais la commande n’a pas pu être synchronisée.',
        tracking,
      })
    }

    return res.status(200).json({
      success: true,
      tracking,
      label_url: labelUrl,
    })
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'Délai dépassé vers Yalidine'
        : error?.message || 'Erreur réseau Yalidine'

    console.error('Erreur Yalidine:', error)

    await markUnknown(auth.client, dispatch, message)

    return res.status(502).json({
      error: 'La tentative Yalidine est incertaine. Vérifie Yalidine avant de relancer pour éviter un doublon.',
    })
  } finally {
    clearTimeout(timeout)
  }
}
