// api/_auth.js
// Vérification serveur d'une session Supabase + allowlist admin.
import { createClient } from '@supabase/supabase-js'

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return { url, anonKey }
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req)
  if (!token) return { user: null, error: 'Missing Authorization bearer token' }

  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) return { user: null, error: 'Supabase server configuration missing' }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user) return { user: null, error: 'Invalid or expired session' }

  return { user: data.user, client }
}

export async function requireAdmin(req, res) {
  const auth = await getAuthenticatedUser(req)
  if (!auth.user || !auth.client) {
    return { ok: false, response: res.status(401).json({ error: auth.error || 'Unauthorized' }) }
  }

  const { data, error } = await auth.client
    .from('admin_users')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, response: res.status(403).json({ error: 'Administrator authorization required' }) }
  }

  return { ok: true, user: auth.user, client: auth.client }
}
