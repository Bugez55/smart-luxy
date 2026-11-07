// api/import-product.js — Import rapide de produit depuis un lien fournisseur
// Support : Open Graph + JSON-LD + extraction spécifique AliExpress
// + fallback "coller le code source" quand le fetch serveur est bloqué
// + téléchargement des images AliExpress vers Supabase Storage

import { assertSafeUrl, fetchSafeUrl } from './_safe-fetch.js'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'
import { getVerifiedImageExtension } from './_image-validation.js'

const MAX_RESPONSE_BYTES = 6 * 1024 * 1024
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_PASTED_HTML_BYTES = 2 * 1024 * 1024
const STORAGE_BUCKET = 'product-images'


async function safeFetchHtml(rawUrl, options = {}) {
  const { response } = await fetchSafeUrl(rawUrl, {
    ...options,
    maxBytes: MAX_RESPONSE_BYTES,
    errorMessage: 'Page trop volumineuse',
  })

  return response
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

function getImageExtension(buffer, contentType) {
  return getVerifiedImageExtension(buffer, contentType)
}

async function fetchImageSafely(rawUrl) {
  const { response, finalUrl } = await fetchSafeUrl(rawUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
      'Accept':
        'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language':
        'fr-FR,fr;q=0.9,en;q=0.8',
    },
    maxBytes: MAX_IMAGE_BYTES,
    errorMessage: 'Image trop volumineuse',
  })

  if (!response.ok) {
    throw new Error(`Image inaccessible (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  const normalizedContentType = contentType.split(';')[0].trim().toLowerCase()
  const allowedImageTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  ])

  if (!allowedImageTypes.has(normalizedContentType)) {
    throw new Error(
      `Format d'image non autorisé (${normalizedContentType || 'type inconnu'})`
    )
  }

  return { response, contentType, finalUrl }
}

async function readResponseBuffer(response, maxBytes, errorMessage = 'Réponse trop volumineuse') {
  if (!response.body?.getReader) {
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error(errorMessage)
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
        throw new Error(errorMessage)
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

  const extension = getImageExtension(buffer, contentType)

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

// Stocke les images une par une : une image distante défectueuse ne doit
// pas faire échouer tout l'import. Les URLs originales restent disponibles
// en solution de repli lorsque Storage refuse un fichier.
async function storeAliExpressImages(supabase, imageUrls) {
  const uniqueUrls = [...new Set(
    (Array.isArray(imageUrls) ? imageUrls : [])
      .filter(url => typeof url === 'string' && /^https?:\/\//i.test(url))
  )].slice(0, 12)

  return Promise.all(uniqueUrls.map(async (imageUrl, index) => {
    try {
      return await downloadAndStoreImage(supabase, imageUrl, index)
    } catch (error) {
      console.warn('Image AliExpress non stockée :', error?.message || error)
      return imageUrl
    }
  }))
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
    if (Buffer.byteLength(pastedHtml, 'utf8') > MAX_PASTED_HTML_BYTES) {
      return res.status(413).json({ error: 'Le code HTML collé dépasse la limite autorisée de 2 Mio.' })
    }

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
          auth.client,
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

    const html = (await readResponseBuffer(
      response,
      MAX_RESPONSE_BYTES,
      'Réponse distante trop volumineuse.'
    )).toString('utf8')

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
          auth.client,
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