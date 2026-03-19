// ══════════════════════════════════════════════
//  HOOK useSettings — Paramètres depuis Supabase
//  Utilisé partout pour avoir le vrai téléphone/email
// ══════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Cache en mémoire pour éviter trop de requêtes
let cache = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Valeurs par défaut
const DEFAULTS = {
  shop_name:    'Smart Luxy',
  shop_phone:   '213556688810',
  shop_email:   'nabilmohellebi2@gmail.com',
  shop_address: 'Tizi Ouzou, Algérie',
  free_ship:    '',
  maintenance:  'false',
}

export async function getSettings() {
  // Retourner le cache si frais
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache

  const { data } = await supabase.from('settings').select('key, value')
  if (!data) return DEFAULTS

  const settings = { ...DEFAULTS }
  data.forEach(({ key, value }) => { settings[key] = value })
  cache = settings
  cacheTime = Date.now()
  return settings
}

export async function saveSetting(key, value) {
  const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
  cache = null
  cacheTime = 0
  if (error) console.error('saveSetting error:', error)
}

export async function saveSettings(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({
    key, value: String(value), updated_at: new Date().toISOString()
  }))
  const { error } = await supabase.from('settings').upsert(rows)
  // Vider le cache pour forcer rechargement
  cache = null
  cacheTime = 0
  if (error) {
    console.error('saveSettings error:', error)
    throw error
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
