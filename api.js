import { supabase } from '../supabase'

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

export async function authHeaders(extra = {}) {
  const token = await getAccessToken()
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra }
}

export async function sendCapiEvent(payload, requireAdmin = false) {
  const headers = await authHeaders({ 'Content-Type': 'application/json' })
  const response = await fetch('/api/capi', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.error || `CAPI HTTP ${response.status}`)
    error.status = response.status
    if (requireAdmin && response.status === 401) error.message = 'Session admin expirée'
    throw error
  }
  return data
}
