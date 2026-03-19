import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cache = null
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes seulement

const DEFAULTS = {
  shop_name:      'Smart Luxy',
  shop_phone:     '213556688810',
  shop_email:     'nabilmohellebi2@gmail.com',
  shop_address:   'Tizi Ouzou, Algérie',
  free_ship:      '',
  maintenance:    'false',
  admin_password: '',
}

export async function getSettings() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache
  const { data, error } = await supabase.from('settings').select('key, value')
  if (error) { console.error('getSettings:', error); return DEFAULTS }
  if (!data || data.length === 0) return DEFAULTS
  const s = { ...DEFAULTS }
  data.forEach(({ key, value }) => { s[key] = value })
  cache = s
  cacheTime = Date.now()
  return s
}

// ── Sauvegarder UNE seule clé ──
export async function saveSetting(key, value) {
  cache = null; cacheTime = 0

  // D'abord essayer update
  const { error: errU } = await supabase
    .from('settings')
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key)

  if (errU) {
    // Si update échoue → insert
    const { error: errI } = await supabase
      .from('settings')
      .insert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (errI) { console.error('saveSetting insert:', errI); throw errI }
  }
}

// ── Sauvegarder PLUSIEURS clés ──
export async function saveSettings(obj) {
  cache = null; cacheTime = 0

  const errors = []
  for (const [key, value] of Object.entries(obj)) {
    try {
      await saveSetting(key, value)
    } catch(e) {
      errors.push(key + ': ' + e.message)
    }
  }

  if (errors.length > 0) {
    throw new Error('Erreurs : ' + errors.join(', '))
  }
  return true
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}
