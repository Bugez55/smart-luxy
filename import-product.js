// api/import-product.js — Import rapide de produit depuis un lien fournisseur
// Support : Open Graph + JSON-LD + extraction spécifique AliExpress
// + fallback "coller le code source" quand le fetch serveur est bloqué
// + téléchargement des images AliExpress vers Supabase Storage

import dns from 'dns/promises'
import net from 'net'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'

const MAX_RESPONSE_BYTES = 6 * 1024 * 1024
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const STORAGE_BUCKET = 'product-images'

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number)

  if (
    parts.length !== 4 ||
    parts.some(n => !Number.isInteger(n))
  ) {
    return true
  }

  const [a, b] = parts

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && b >= 18 && b <= 19) ||
    ((a === 198 && b === 51) && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  )
}

function isPrivateIpv6(ip) {
  const value = ip.toLowerCase()

  return (
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb')
  )
}

async function assertSafeUrl(rawUrl) {
  let u

  try {
    u = new URL(rawUrl)
  } catch {
    throw new Error('URL invalide')
  }

  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Protocole non autorisé')
  }

  if (u.username || u.password) {
    throw new Error('URL avec identifiants non autorisée')
  }

  const hostname = u.hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase()

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'local' ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254'
  ) {
    throw new Error('Destination non autorisée')
  }

  if (net.isIP(hostname)) {
    if (
      (net.isIP(hostname) === 4 && isPrivateIpv4(hostname)) ||
      (net.isIP(hostname) === 6 && isPrivateIpv6(hostname))
    ) {
      throw new Error('Destination réseau privée non autorisée')
    }

    return u.href
  }

  const resolved = await dns.lookup(hostname)

  if (
    (net.isIP(resolved.address) === 4 &&
      isPrivateIpv4(resolved.address)) ||
    (net.isIP(resolved.address) === 6 &&
      isPrivateIpv6(resolved.address))
  ) {
    throw new Error('Destination réseau privée non autorisée')
  }

  return u.href
}

async function safeFetchHtml(rawUrl, options = {}) {
  let currentUrl = await assertSafeUrl(rawUrl)

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(currentUrl, {
      ...options,
      redirect: 'manual',
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')

      if (!location) {
        throw new Error('Redirection invalide')
      }

      currentUrl = await assertSafeUrl(
        new URL(location, currentUrl).href
      )

      continue
    }

    const contentLength = Number(
      response.headers.get('content-length') || 0
    )

    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error('Page trop volumineuse')
    }

    return response
  }

  throw new Error('Trop de redirections')
}

function getAllMeta(html, prop) {
  const results = []

  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    'gi'
  )

  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    'gi'
  )

  let m

  while ((m = re1.exec(html)) !== null) {
    results.push(m[1])
  }

  while ((m = re2.exec(html)) !== null) {
    results.push(m[1])
  }

  return [...new Set(results)]
}

function cleanImageUrl(str) {
  if (!str) return str

  return str
    .replace(/^"|"$/g, '')
    .replace(/\\\//g, '/')
    .replace(
      /\\u([\dA-Fa-f]{4})/g,
      (_, code) =>
        String.fromCharCode(parseInt(code, 16))
    )
    .trim()
}

function decodeEntities(str) {
  if (!str) return str

  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(
      /\\u([\dA-Fa-f]{4})/g,
      (_, code) =>
        String.fromCharCode(parseInt(code, 16))
    )
}

// ── Extraction spécifique AliExpress ──

function extractAliExpress(html) {
  const result = {
    nom: null,
    prix: null,
    description: null,
    images: []
  }

  let m =
    html.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    html.match(/"productTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    html.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    html.match(
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i
    ) ||
    html.match(/<title>([^<]+)<\/title>/i)

  if (m) {
    result.nom = decodeEntities(
      m[1].replace(/\\"/g, '"')
    )
      .replace(/\s*-\s*AliExpress.*$/i, '')
      .trim()
  }

  m =
    html.match(/"formatedActivityPrice"\s*:\s*"([^"]+)"/) ||
    html.match(/"formatedPrice"\s*:\s*"([^"]+)"/) ||
    html.match(
      /"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/
    ) ||
    html.match(
      /"minAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/
    ) ||
    html.match(
      /"salePrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/
    )

  if (m) {
    const rawPrice = m[1]
      .replace(/[^\d.,]/g, '')
      .replace(',', '.')

    result.prix = parseFloat(rawPrice) || null
  }

  m =
    html.match(/"imagePathList"\s*:\s*\[([^\]]+)\]/) ||
    html.match(/"images"\s*:\s*\[([^\]]+)\]/) ||
    html.match(/"imageList"\s*:\s*\[([^\]]+)\]/)

  if (m) {
    const urls = m[1].match(/"(https?:\/\/[^"]+)"/g)

    if (urls) {
      result.images = urls.map(cleanImageUrl)
    }
  }

  m =
    html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    html.match(
      /"productDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/
    )

  if (m) {
    result.description = decodeEntities(
      m[1].replace(/\\"/g, '"')
    )
  } else {
    const metaDesc =
      getAllMeta(html, 'og:description')[0] ||
      getAllMeta(html, 'description')[0]

    if (metaDesc) {
      result.description = decodeEntities(metaDesc).trim()
    }
  }

  return result
}

// ── Extraction générale ──

function extractGeneric(html) {
  let nom =
    getAllMeta(html, 'og:title')[0] ||
    getAllMeta(html, 'twitter:title')[0] ||
    null

  if (nom) {
    nom = decodeEntities(nom).trim()
  }

  let description =
    getAllMeta(html, 'og:description')[0] ||
    getAllMeta(html, 'description')[0] ||
    null

  if (description) {
    description = decodeEntities(description).trim()
  }

  let images = getAllMeta(html, 'og:image').map(cleanImageUrl)
  let prix = null

  const jsonLdMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of jsonLdMatches) {
    try {
      let data = JSON.parse(match[1])

      if (Array.isArray(data)) {
        data =
          data.find(d => d['@type'] === 'Product') ||
          data[0]
      }

      if (data['@graph']) {
        data =
          data['@graph'].find(
            d => d['@type'] === 'Product'
          ) || data
      }

      if (data['@type'] === 'Product' || data.name) {
        nom = nom || data.name
        description = description || data.description

        const offer = Array.isArray(data.offers)
          ? data.offers[0]
          : data.offers

        if (offer?.price) {
          prix = parseFloat(offer.price)
        }

        if (data.image) {
          const jsonLdImages = Array.isArray(data.image)
            ? data.image
            : [data.image]

          images = [
            ...new Set([
              ...images,
              ...jsonLdImages
            ])
          ]
        }
      }
    } catch {
      // JSON-LD malformé, ignoré
    }
  }

  if (images.length < 2) {
    const galleryMatch = html.match(
      /"images?"\s*:\s*\[([^\]]{20,2000})\]/
    )

    if (galleryMatch) {
      const found =
        galleryMatch[1].match(
          /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
        )

      if (found) {
        images = [
          ...new Set([
            ...images,
            ...found.map(cleanImageUrl)
          ])
        ]
      }
    }
  }

  return {
    nom,
    prix,
    description,
    images
  }
}

function finalizeResult(extracted, isAliExpress) {
  let {
    nom,
    prix,
    description,
    images
  } = extracted

  images = [...new Set(images)]
    .filter(
      img =>
        typeof img === 'string' &&
        img.startsWith('http')
    )
    .slice(0, 10)

  if (description && description.length > 2000) {
    description =
      description.slice(0, 2000) + '…'
  }

  return {
    nom: nom || '',
    description: description || '',
    prix,
    images,
    source: isAliExpress
      ? 'aliexpress'
      : 'generic'
  }
}

// ─────────────────────────────────────────────
// SUPABASE STORAGE
// ─────────────────────────────────────────────

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL

  const secretKey =
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL / VITE_SUPABASE_URL manquant dans Vercel'
    )
  }

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY manquant dans Vercel'
    )
  }

  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  )
}

function getImageExtension(contentType, imageUrl) {
  const type = (contentType || '').toLowerCase()

  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  if (type.includes('avif')) return 'avif'
  if (type.includes('jpeg') || type.includes('jpg')) {
    return 'jpg'
  }

  try {
    const pathname = new URL(imageUrl).pathname
    const match = pathname.match(
      /\.(jpg|jpeg|png|webp|gif|avif)$/i
    )

    if (match) {
      return match[1].toLowerCase() === 'jpeg'
        ? 'jpg'
        : match[1].toLowerCase()
    }
  } catch {
    // ignore
  }

  return 'jpg'
}

async function fetchImageSafely(rawUrl) {
  let currentUrl = await assertSafeUrl(rawUrl)

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
        'Accept':
          'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language':
          'fr-FR,fr;q=0.9,en;q=0.8',
      },
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Redirection image invalide')
      currentUrl = await assertSafeUrl(
        new URL(location, currentUrl).href
      )
      continue
    }

    if (!response.ok) {
      throw new Error(`Image inaccessible (${response.status})`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error(
        `Le serveur distant n'a pas renvoyé une image (${contentType || 'type inconnu'})`
      )
    }

    const contentLength = Number(
      response.headers.get('content-length') || 0
    )

    if (contentLength > MAX_IMAGE_BYTES) {
      throw new Error('Image trop volumineuse')
    }

    return { response, contentType, finalUrl: currentUrl }
  }

  throw new Error('Trop de redirections image')
}

async function readResponseBuffer(response, maxBytes) {
  if (!response.body?.getReader) {
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error('Image trop volumineuse')
    }
    return Buffer.from(arrayBuffer)
  }

  const reader = response.body.getReader()
  const chunks = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error('Image trop volumineuse')
      }

      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, total)
}

async function downloadAndStoreImage(
  supabase,
  imageUrl,
  index
) {
  const {
    response,
    contentType,
    finalUrl,
  } = await fetchImageSafely(imageUrl)

  const buffer = await readResponseBuffer(
    response,
    MAX_IMAGE_BYTES
  )

  const extension = getImageExtension(
    contentType,
    finalUrl
  )

  const hash = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex')
    .slice(0, 24)

  const filePath =
    `aliexpress/${hash}-${index}.${extension}`

  const { error: uploadError } =
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(
        filePath,
        buffer,
        {
          contentType:
            contentType.split(';')[0] ||
            'image/jpeg',
          cacheControl: '31536000',
          upsert: true,
        }
      )

  if (uploadError) {
    throw new Error(
      `Upload Storage impossible : ${uploadError.message}`
    )
  }

  const { data: publicData } =
    supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

  if (!publicData?.publicUrl) {
    throw new Error(
      'URL publique Supabase impossible à générer'
    )
  }

  return publicData.publicUrl
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export default async function handler(req, res) {
  const isAllowedOrigin = applyCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(isAllowedOrigin ? 204 : 403).end()
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({
        error: 'Method not allowed'
      })
  }

  if (!isAllowedOrigin) {
    return res
      .status(403)
      .json({
        error: 'Origine non autorisée'
      })
  }

  const auth = await requireAdmin(req, res)

  if (!auth.ok) {
    return auth.response
  }

  const {
    url,
    html: pastedHtml
  } = req.body || {}

  // ─────────────────────────────────────────
  // CAS 1 : HTML COLLÉ
  // ─────────────────────────────────────────

  if (
    pastedHtml &&
    typeof pastedHtml === 'string'
  ) {
    if (pastedHtml.length < 200) {
      return res.status(400).json({
        error:
          'Le code collé semble incomplet ou vide.'
      })
    }

    const isAliExpress =
      /aliexpress\.(com|fr|us)|"aeItemId"|"aeop_/i.test(
        pastedHtml
      ) ||
      (url &&
        /aliexpress\./i.test(url))

    const aliResult = isAliExpress
      ? extractAliExpress(pastedHtml)
      : {
          nom: null,
          prix: null,
          description: null,
          images: []
        }

    const genResult =
      extractGeneric(pastedHtml)

    const merged = {
      nom:
        aliResult.nom ||
        genResult.nom,

      prix:
        aliResult.prix ||
        genResult.prix,

      description:
        aliResult.description ||
        genResult.description,

      images: [
        ...new Set([
          ...(aliResult.images || []),
          ...(genResult.images || [])
        ])
      ]
    }

    let result =
      finalizeResult(
        merged,
        isAliExpress
      )

    if (
      !result.nom &&
      result.images.length === 0
    ) {
      return res.status(422).json({
        error:
          "Aucune information trouvée dans le code collé. Assure-toi d'avoir copié la page complète (Ctrl+A puis Ctrl+C sur la page, pas juste une partie)."
      })
    }

    // Télécharger les images AliExpress
    if (
      isAliExpress &&
      result.images.length > 0
    ) {
      const storedImages =
        await storeAliExpressImages(
          result.images
        )

      if (storedImages.length > 0) {
        result.images = storedImages
      }
    }

    return res.status(200).json(result)
  }

  // ─────────────────────────────────────────
  // CAS 2 : URL FOURNIE
  // ─────────────────────────────────────────

  if (
    !url ||
    typeof url !== 'string'
  ) {
    return res.status(400).json({
      error: 'Lien invalide'
    })
  }

  let safeUrl

  try {
    safeUrl =
      await assertSafeUrl(
        url.trim()
      )
  } catch (e) {
    return res.status(400).json({
      error:
        e.message ||
        'Lien non autorisé'
    })
  }

  const isAliExpress =
    /aliexpress\./i.test(
      safeUrl
    )

  try {
    const response =
      await safeFetchHtml(
        safeUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',

            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',

            'Accept-Language':
              isAliExpress
                ? 'fr-FR,fr;q=0.9,en;q=0.8'
                : 'fr-FR,fr;q=0.9'
          }
        }
      )

    if (!response.ok) {
      return res.status(400).json({
        error:
          `Impossible d'accéder à ce lien (${response.status})`
      })
    }

    const html =
      await response.text()

    if (
      html.length >
      MAX_RESPONSE_BYTES
    ) {
      return res.status(413).json({
        error:
          'Réponse distante trop volumineuse.'
      })
    }

    const aliResult =
      isAliExpress
        ? extractAliExpress(html)
        : {
            nom: null,
            prix: null,
            description: null,
            images: []
          }

    const genResult =
      extractGeneric(html)

    const merged = {
      nom:
        aliResult.nom ||
        genResult.nom,

      prix:
        aliResult.prix ||
        genResult.prix,

      description:
        aliResult.description ||
        genResult.description,

      images: [
        ...new Set([
          ...(aliResult.images || []),
          ...(genResult.images || [])
        ])
      ]
    }

    let result =
      finalizeResult(
        merged,
        isAliExpress
      )

    if (
      !result.nom &&
      result.images.length === 0
    ) {
      const msg =
        isAliExpress
          ? 'AliExpress a bloqué la récupération automatique (protection anti-robot). Utilise l\'option "Coller le code source" ci-dessous à la place — ça fonctionne car ta propre page n\'est pas bloquée.'
          : 'Aucune information trouvée sur cette page. Le site n\'expose peut-être pas de données produit standard — essaie "Coller le code source".'

      return res.status(422).json({
        error: msg,
        canPasteHtml: true
      })
    }

    // Télécharger les images AliExpress
    if (
      isAliExpress &&
      result.images.length > 0
    ) {
      const storedImages =
        await storeAliExpressImages(
          result.images
        )

      if (storedImages.length > 0) {
        result.images = storedImages
      }
    }

    return res.status(200).json(result)

  } catch (error) {
    console.error(
      'Erreur import produit:',
      error
    )

    return res.status(500).json({
      error:
        'Erreur lors de la récupération de la page. Essaie "Coller le code source".',
      canPasteHtml: true
    })
  }
}