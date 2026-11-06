import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const MAX_REDIRECTS = 4
const REQUEST_TIMEOUT_MS = 15000
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

const BLOCKED_IPV4_CIDRS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]

function ipv4ToNumber(ip) {
  if (net.isIP(ip) !== 4) return null
  return ip.split('.').reduce((value, part) => (
    ((value << 8) | Number(part)) >>> 0
  ), 0)
}

function inCidr(ipNumber, network, prefix) {
  const networkNumber = ipv4ToNumber(network)
  if (networkNumber === null) return true
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNumber & mask) === (networkNumber & mask)
}

export function isPublicIPv4(ip) {
  const ipNumber = ipv4ToNumber(ip)
  if (ipNumber === null) return false

  return !BLOCKED_IPV4_CIDRS.some(([network, prefix]) => (
    inCidr(ipNumber, network, prefix)
  ))
}

export function assertSafeUrl(rawUrl) {
  let url

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('URL invalide')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocole non autorisé')
  }

  if (url.username || url.password) {
    throw new Error('URL avec identifiants non autorisée')
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase()

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'local' ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Destination non autorisée')
  }

  const ipFamily = net.isIP(hostname)

  if (ipFamily === 6) {
    throw new Error('Les adresses IPv6 ne sont pas autorisées pour cet import')
  }

  if (ipFamily === 4 && !isPublicIPv4(hostname)) {
    throw new Error('Destination réseau privée ou réservée non autorisée')
  }

  return url.href
}

async function resolvePublicIPv4(hostname) {
  if (net.isIP(hostname) === 4) {
    if (!isPublicIPv4(hostname)) {
      throw new Error('Destination réseau privée ou réservée non autorisée')
    }
    return hostname
  }

  let addresses

  try {
    addresses = await dns.lookup(hostname, {
      family: 4,
      all: true,
      verbatim: true,
    })
  } catch {
    throw new Error('Impossible de résoudre une adresse IPv4 publique')
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Aucune adresse IPv4 publique trouvée')
  }

  if (addresses.some(({ address }) => !isPublicIPv4(address))) {
    throw new Error('Le domaine résout vers une adresse réseau privée ou réservée')
  }

  return addresses[0].address
}

function headersForResponse(incomingHeaders) {
  const result = {}
  const excluded = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'set-cookie',
  ])

  for (const [name, value] of Object.entries(incomingHeaders)) {
    if (value === undefined || excluded.has(name.toLowerCase())) continue
    result[name] = Array.isArray(value) ? value.join(', ') : String(value)
  }

  return result
}

async function requestPinned(url, headers, maxBytes, errorMessage) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const pinnedAddress = await resolvePublicIPv4(hostname)
  const transport = url.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    let settled = false

    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const requestOptions = {
      protocol: url.protocol,
      hostname: pinnedAddress,
      port: url.port || undefined,
      method: 'GET',
      path: url.pathname + url.search,
      headers: {
        ...headers,
        host: url.host,
        connection: 'close',
        'accept-encoding': 'identity',
      },
      timeout: REQUEST_TIMEOUT_MS,
    }

    if (url.protocol === 'https:' && net.isIP(hostname) === 0) {
      requestOptions.servername = hostname
      requestOptions.checkServerIdentity = (_serverName, certificate) => (
        tls.checkServerIdentity(hostname, certificate)
      )
    }

    const request = transport.request(requestOptions, (incoming) => {
      const chunks = []
      let totalBytes = 0

      incoming.on('data', (chunk) => {
        totalBytes += chunk.length
        if (totalBytes > maxBytes) {
          incoming.destroy(new Error(errorMessage))
          return
        }
        chunks.push(chunk)
      })

      incoming.on('end', () => {
        if (settled) return

        const status = Number(incoming.statusCode) || 502
        const body = Buffer.concat(chunks, totalBytes)

        try {
          const response = new Response(body.length ? body : null, {
            status,
            headers: headersForResponse(incoming.headers),
          })
          settled = true
          resolve(response)
        } catch (error) {
          fail(error)
        }
      })

      incoming.on('error', fail)
    })

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error('Délai dépassé lors du téléchargement distant'))
    })

    request.on('error', fail)
    request.end()
  })
}

export async function fetchSafeUrl(rawUrl, options = {}) {
  const {
    headers = {},
    maxBytes = 6 * 1024 * 1024,
    errorMessage = 'Réponse distante trop volumineuse',
  } = options

  let currentUrl = assertSafeUrl(rawUrl)

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const parsedUrl = new URL(currentUrl)
    const response = await requestPinned(parsedUrl, headers, maxBytes, errorMessage)

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Redirection invalide')
      currentUrl = assertSafeUrl(new URL(location, currentUrl).href)
      continue
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(errorMessage)
    }

    return { response, finalUrl: currentUrl }
  }

  throw new Error('Trop de redirections')
}
