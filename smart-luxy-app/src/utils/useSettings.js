
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cache = null
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes seulement

const DEFAULTS = {
  shop_name: 'Wazyo',
  shop_phone: '213556688810',
  shop_email: 'smartluxydz@gmail.com',
  shop_address: 'Tizi Ouzou, Algérie',
  free_ship: '',
  maintenance: 'false',
}

export async function getSettings() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error) {
    console.error('getSettings:', error)
    return DEFAULTS
  }

  if (!data || data.length === 0) return DEFAULTS

  const s = { ...DEFAULTS }
  data.forEach(({ key, value }) => {
    s[key] = value
  })

  cache = s
  cacheTime = Date.now()

  return s
}

// Sauvegarder une clé : créer la ligne si elle n'existe pas,
// ou mettre à jour sa valeur si elle existe déjà.
export async function saveSetting(key, value) {
  cache = null
  cacheTime = 0

  const { error } = await supabase
    .from('settings')
    .upsert(
      {
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) {
    console.error('saveSetting upsert:', error)
    throw error
  }
}

// Sauvegarder plusieurs clés
export async function saveSettings(obj) {
  cache = null
  cacheTime = 0

  const errors = []

  for (const [key, value] of Object.entries(obj)) {
    try {
      await saveSetting(key, value)
    } catch (e) {
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
