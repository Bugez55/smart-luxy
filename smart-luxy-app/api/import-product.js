// api/import-product.js — Import rapide de produit depuis un lien fournisseur
// Support : Open Graph + JSON-LD + extraction spécifique AliExpress
// + fallback "coller le code source" quand le fetch serveur est bloqué (anti-robot)

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

  // Titre — plusieurs formats possibles selon la version de page
  let m = html.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
           html.match(/"productTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
           html.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
           html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
           html.match(/<title>([^<]+)<\/title>/i)
  if (m) result.nom = decodeEntities(m[1].replace(/\\"/g, '"')).replace(/\s*-\s*AliExpress.*$/i, '').trim()

  // Prix (plusieurs formats possibles selon la version du site)
  m = html.match(/"formatedActivityPrice"\s*:\s*"([^"]+)"/) ||
      html.match(/"formatedPrice"\s*:\s*"([^"]+)"/) ||
      html.match(/"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/) ||
      html.match(/"minAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/) ||
      html.match(/"salePrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/)
  if (m) {
    const rawPrice = m[1].replace(/[^\d.,]/g, '').replace(',', '.')
    result.prix = parseFloat(rawPrice) || null
  }

  // Images — imagePathList contient toutes les photos galerie
  m = html.match(/"imagePathList"\s*:\s*\[([^\]]+)\]/) ||
      html.match(/"images"\s*:\s*\[([^\]]+)\]/) ||
      html.match(/"imageList"\s*:\s*\[([^\]]+)\]/)
  if (m) {
    const urls = m[1].match(/"(https?:\/\/[^"]+)"/g)
    if (urls) result.images = urls.map(u => u.replace(/^"|"$/g, ''))
  }

  // Description — plusieurs emplacements possibles + fallback meta description standard
  m = html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
      html.match(/"productDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) {
    result.description = decodeEntities(m[1].replace(/\\"/g, '"'))
  } else {
    // Fallback : meta description classique si rien trouvé dans les données internes
    const metaDesc = getAllMeta(html, 'og:description')[0] || getAllMeta(html, 'description')[0]
    if (metaDesc) result.description = decodeEntities(metaDesc).trim()
  }

  return result
}

// ── Extraction générale : Open Graph + JSON-LD ──
function extractGeneric(html) {
  let nom = getAllMeta(html, 'og:title')[0] || getAllMeta(html, 'twitter:title')[0] || null
  if (nom) nom = decodeEntities(nom).trim()

  let description = getAllMeta(html, 'og:description')[0] || getAllMeta(html, 'description')[0] || null
  if (description) description = decodeEntities(description).trim()

  let images = getAllMeta(html, 'og:image')
  let prix = null

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

  if (images.length < 2) {
    const galleryMatch = html.match(/"images?"\s*:\s*\[([^\]]{20,2000})\]/)
    if (galleryMatch) {
      const found = galleryMatch[1].match(/"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)
      if (found) images = [...new Set([...images, ...found.map(f => f.replace(/^"|"$/g, ''))])]
    }
  }

  return { nom, prix, description, images }
}

function finalizeResult(extracted, isAliExpress) {
  let { nom, prix, description, images } = extracted
  images = [...new Set(images)]
    .filter(img => typeof img === 'string' && img.startsWith('http'))
    .slice(0, 10)
  if (description && description.length > 2000) description = description.slice(0, 2000) + '…'
  return { nom: nom || '', description: description || '', prix, images, source: isAliExpress ? 'aliexpress' : 'generic' }
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

  const { url, html: pastedHtml } = req.body

  // ── Cas 1 : HTML collé directement (fallback anti-blocage) ──
  // Le navigateur de l'ADMIN a déjà chargé la page normalement, donc aucune
  // protection anti-robot ne s'applique — on extrait juste depuis le texte fourni.
  if (pastedHtml && typeof pastedHtml === 'string') {
    if (pastedHtml.length < 200) {
      return res.status(400).json({ error: 'Le code collé semble incomplet ou vide.' })
    }
    const isAliExpress = /aliexpress|"aeItemId"|"productId"/i.test(pastedHtml.slice(0, 5000)) || (url && /aliexpress\./i.test(url))
    const extracted = isAliExpress ? extractAliExpress(pastedHtml) : extractGeneric(pastedHtml)
    const result = finalizeResult(extracted, isAliExpress)
    if (!result.nom && result.images.length === 0) {
      return res.status(422).json({ error: "Aucune information trouvée dans le code collé. Assure-toi d'avoir copié la page complète (Ctrl+A puis Ctrl+C sur la page, pas juste une partie)." })
    }
    return res.status(200).json(result)
  }

  // ── Cas 2 : lien fourni — le serveur va chercher la page lui-même ──
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
    const extracted = isAliExpress ? extractAliExpress(html) : extractGeneric(html)
    const result = finalizeResult(extracted, isAliExpress)

    if (!result.nom && result.images.length === 0) {
      const msg = isAliExpress
        ? "AliExpress a bloqué la récupération automatique (protection anti-robot). Utilise l'option \"Coller le code source\" ci-dessous à la place — ça fonctionne car ta propre page n'est pas bloquée."
        : "Aucune information trouvée sur cette page. Le site n'expose peut-être pas de données produit standard — essaie \"Coller le code source\"."
      return res.status(422).json({ error: msg, canPasteHtml: true })
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('Erreur import produit:', error)
    return res.status(500).json({ error: "Erreur lors de la récupération de la page. Essaie \"Coller le code source\".", canPasteHtml: true })
  }
}
