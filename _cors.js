// Shared strict CORS helper for Vercel serverless functions.
// Only explicitly configured / production-owned exact origins are allowed.
const DEFAULT_ORIGINS = [
  'https://wazyo.com',
  'https://www.wazyo.com',
  'https://wazyo.vercel.app',
]

function normalizeOrigin(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  try {
    const origin = /^https?:\/\//i.test(raw)
      ? new URL(raw).origin
      : new URL(`https://${raw}`).origin
    return origin
  } catch {
    return null
  }
}

export function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  // Defaults keep production working if the env var is accidentally omitted.
  // Preview/branch URLs are NEVER admitted automatically. Add an exact URL
  // to ALLOWED_ORIGINS when a preview needs to call these APIs.
  const values = configured.length ? configured : DEFAULT_ORIGINS

  return [...new Set(values.map(normalizeOrigin).filter(Boolean))]
}

export function isAllowedOrigin(origin) {
  const normalized = normalizeOrigin(origin)
  return !!normalized && getAllowedOrigins().includes(normalized)
}

export function applyCors(req, res) {
  const origin = normalizeOrigin(req.headers?.origin || '')
  const allowed = !!origin && getAllowedOrigins().includes(origin)

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return allowed
}
