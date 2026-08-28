// api/import-product.js — Import rapide de produit depuis un lien fournisseur
// Support renforcé : Open Graph + JSON-LD + extraction spécifique AliExpress

const ALLOWED_ORIGIN = 'https://wazyo.vercel.app'

function getAllMeta(html, prop) {
  const results = []
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'gi')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'gi')
  let m
  while ((m = re1.exec(html)) !== null) results.push(m[1])
  while ((m = re2.exec(html)) !== null) results.push(m[1])
  return [...new Set(results)]
}

function decodeEntities(str) {
  if (!str) return str
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

// ── Extraction spécifique AliExpress — les données sont dans window.runParams ──
function extractAliExpress(html) {
  const result = { nom: null, prix: null, description: null, images: [] }

  // Titre
  let m = html.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
           html.match(/"productTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) result.nom = decodeEntities(m[1].replace(/\\"/g, '"'))

  // Prix (plusieurs formats possibles selon la version du site)
  m = html.match(/"formatedActivityPrice"\s*:\s*"([^"]+)"/) ||
      html.match(/"formatedPrice"\s*:\s*"([^"]+)"/) ||
      html.match(/"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/) ||
      html.match(/"minAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/)
  if (m) {
    const rawPrice = m[1].replace(/[^\d.,]/g, '').replace(',', '.')
    result.prix = parseFloat(rawPrice) || null
  }

  // Images — imagePathList contient toutes les photos galerie
  m = html.match(/"imagePathList"\s*:\s*\[([^\]]+)\]/) ||
      html.match(/"images"\s*:\s*\[([^\]]+)\]/)
  if (m) {
    const urls = m[1].match(/"(https?:\/\/[^"]+)"/g)
    if (urls) result.images = urls.map(u => u.replace(/^"|"$/g, ''))
  }

  // Description — souvent une URL séparée vers une page de description (iframe), sinon fallback meta
  m = html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) result.description = decodeEntities(m[1].replace(/\\"/g, '"'))

  return result
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

  const { url } = req.body
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Lien invalide' })
  }

  const isAliExpress = /aliexpress\./i.test(url)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': isAliExpress ? 'fr-FR,fr;q=0.9,en;q=0.8' : 'fr-FR,fr;q=0.9',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return res.status(400).json({ error: `Impossible d'accéder à ce lien (${response.status})` })
    }

    const html = await response.text()

    let nom = null, description = null, prix = null, images = []

    // ── Cas spécial AliExpress ──
    if (isAliExpress) {
      const ali = extractAliExpress(html)
      nom = ali.nom
      prix = ali.prix
      description = ali.description
      images = ali.images

      if (!nom && !images.length) {
        return res.status(422).json({
          error: "AliExpress a bloqué la récupération automatique (protection anti-robot). Copie le titre, prix et enregistre les photos manuellement depuis la page produit."
        })
      }
    } else {
      // ── Cas général : Open Graph + JSON-LD ──
      const ogTitles = getAllMeta(html, 'og:title')
      nom = ogTitles[0] || getAllMeta(html, 'twitter:title')[0] || null
      // Ne PAS tronquer le titre — on le garde tel quel, décodé
      if (nom) nom = decodeEntities(nom).trim()

      description = getAllMeta(html, 'og:description')[0] || getAllMeta(html, 'description')[0] || null
      if (description) description = decodeEntities(description).trim()

      // Toutes les images og:image (il peut y en avoir plusieurs balises)
      images = getAllMeta(html, 'og:image')

      // JSON-LD — plus fiable pour le prix, et peut compléter les images
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
              const jsonLdImages = Array.isArray(data.image) ? data.image : [data.image]
              images = [...new Set([...images, ...jsonLdImages])]
            }
          }
        } catch (e) { /* JSON-LD malformé, ignoré */ }
      }

      // Fallback : chercher un pattern générique de galerie d'images dans le HTML
      if (images.length < 2) {
        const galleryMatch = html.match(/"images?"\s*:\s*\[([^\]]{20,2000})\]/)
        if (galleryMatch) {
          const found = galleryMatch[1].match(/"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)
          if (found) images = [...new Set([...images, ...found.map(f => f.replace(/^"|"$/g, ''))])]
        }
      }
    }

    // Nettoyage final images : dédupliquer, filtrer, limiter à 10
    images = [...new Set(images)]
      .filter(img => typeof img === 'string' && img.startsWith('http'))
      .slice(0, 10)

    if (!nom && images.length === 0) {
      return res.status(422).json({ error: "Aucune information trouvée sur cette page. Le site n'expose peut-être pas de données produit standard." })
    }

    // Limiter la description pour éviter du texte brut mal formaté trop long
    if (description && description.length > 2000) {
      description = description.slice(0, 2000) + '…'
    }

    return res.status(200).json({
      nom: nom || '',
      description: description || '',
      prix,
      images,
      source: isAliExpress ? 'aliexpress' : 'generic',
    })
  } catch (error) {
    console.error('Erreur import produit:', error)
    return res.status(500).json({ error: "Erreur lors de la récupération de la page. Vérifie le lien." })
  }
}
