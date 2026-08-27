// api/import-product.js — Import rapide de produit depuis un lien fournisseur
// Récupère la page côté serveur (pas de souci CORS) et extrait :
// - Open Graph (og:title, og:description, og:image) — présent sur presque tous les sites
// - JSON-LD schema.org/Product si disponible (plus précis, notamment le prix)

const ALLOWED_ORIGIN = 'https://wazyo.vercel.app'

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const isAllowedOrigin = origin === ALLOWED_ORIGIN || origin.endsWith('.vercel.app')
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAllowedOrigin) return res.status(403).json({ error: 'Origine non autorisée' })

  const { url } = req.body
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Lien invalide' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return res.status(400).json({ error: `Impossible d'accéder à ce lien (${response.status})` })
    }

    const html = await response.text()

    // ── Extraction Open Graph ──
    const getMeta = (prop) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
      const m = html.match(re)
      return m ? m[1] : null
    }
    const getMetaAlt = (prop) => {
      // Parfois content est avant property
      const re = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
      const m = html.match(re)
      return m ? m[1] : null
    }

    let nom = getMeta('og:title') || getMetaAlt('og:title') || getMeta('twitter:title')
    let description = getMeta('og:description') || getMetaAlt('og:description') || getMeta('description')
    const ogImage = getMeta('og:image') || getMetaAlt('og:image')

    // Nettoyer le titre (souvent suffixé par "- NomDuSite")
    if (nom) nom = nom.split(/[\|\-–]\s*[A-Z]/)[0].trim()

    // ── Extraction JSON-LD (plus fiable pour le prix) ──
    let prix = null
    let images = []
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    for (const match of jsonLdMatches) {
      try {
        let data = JSON.parse(match[1])
        if (Array.isArray(data)) data = data.find(d => d['@type'] === 'Product') || data[0]
        if (data['@graph']) data = data['@graph'].find(d => d['@type'] === 'Product') || data
        if (data['@type'] === 'Product' || data.name) {
          nom = nom || data.name
          description = description || data.description
          const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers
          if (offer?.price) prix = parseFloat(offer.price)
          if (data.image) {
            images = Array.isArray(data.image) ? data.image : [data.image]
          }
        }
      } catch (e) { /* JSON-LD malformé, on ignore */ }
    }

    // Fallback image si pas trouvée en JSON-LD
    if (images.length === 0 && ogImage) images = [ogImage]

    // Limiter à 8 images max
    images = images.slice(0, 8).filter(img => typeof img === 'string' && img.startsWith('http'))

    if (!nom && images.length === 0) {
      return res.status(422).json({ error: "Aucune information trouvée sur cette page. Le site n'expose peut-être pas de données produit standard." })
    }

    return res.status(200).json({
      nom: nom || '',
      description: description || '',
      prix: prix,
      images,
    })
  } catch (error) {
    console.error('Erreur import produit:', error)
    return res.status(500).json({ error: "Erreur lors de la récupération de la page. Vérifie le lien." })
  }
}
