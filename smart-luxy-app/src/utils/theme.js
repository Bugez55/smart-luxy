const THEME_PRESETS = {
  wazyo: {
    bg: '#0a0a0a', card: '#141414', accent: '#C9A84C',
    text: '#e0e0e0', sub: '#888888',
  },
  amazon: {
    bg: '#eaeded', card: '#ffffff', accent: '#ff9900',
    text: '#111827', sub: '#565959',
  },
  minimal: {
    bg: '#f7f9fa', card: '#ffffff', accent: '#087f8c',
    text: '#17252a', sub: '#64748b',
  },
  nature: {
    bg: '#edf3ed', card: '#ffffff', accent: '#26734d',
    text: '#1d3327', sub: '#687b70',
  },
  midnight: {
    bg: '#091321', card: '#122033', accent: '#38bdf8',
    text: '#e8f1fb', sub: '#9db1c8',
  },
  cinematic: {
    bg: '#080a0f', card: '#11151e', accent: '#d5b770',
    text: '#f7f4ed', sub: '#aaa398',
  },
}

const DARK_TEXT = '#111827'
const LIGHT_TEXT = '#f9fafb'

function normalizeHex(value, fallback) {
  let hex = String(value || '').trim().replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(char => char + char).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback
  return '#' + hex.toLowerCase()
}

function relativeLuminance(hex) {
  const normalized = normalizeHex(hex, '#000000').slice(1)
  const channels = [0, 2, 4].map(index => {
    const value = parseInt(normalized.slice(index, index + 2), 16) / 255
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  const brightest = Math.max(a, b)
  const darkest = Math.min(a, b)
  return (brightest + 0.05) / (darkest + 0.05)
}

function readableColor(preferred, backgrounds, minimum = 4.5) {
  const color = normalizeHex(preferred, DARK_TEXT)
  const surfaces = backgrounds.map(value => normalizeHex(value, '#ffffff'))
  const score = candidate => Math.min(...surfaces.map(surface => contrastRatio(candidate, surface)))

  if (score(color) >= minimum) return color

  return score(DARK_TEXT) >= score(LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT
}

export function getReadableTextColorForSurface(surface) {
  const normalized = normalizeHex(surface, null)
  if (!normalized) return null
  return relativeLuminance(normalized) > 0.52 ? DARK_TEXT : LIGHT_TEXT
}

export function resolveWazyoTheme(settings = {}) {
  const rawPreset = String(settings.theme_preset || '').trim().toLowerCase()
  const hasLegacyColors = ['theme_bg', 'theme_card', 'theme_accent', 'theme_text', 'theme_text_sub']
    .some(key => String(settings[key] || '').trim())
  const presetId = rawPreset
    ? (Object.prototype.hasOwnProperty.call(THEME_PRESETS, rawPreset) || rawPreset === 'custom' ? rawPreset : 'custom')
    : (hasLegacyColors ? 'custom' : 'wazyo')
  const preset = THEME_PRESETS[presetId]

  const bg = normalizeHex(settings.theme_bg, preset?.bg || THEME_PRESETS.wazyo.bg)
  const card = normalizeHex(settings.theme_card, preset?.card || THEME_PRESETS.wazyo.card)
  const accent = normalizeHex(settings.theme_accent, preset?.accent || THEME_PRESETS.wazyo.accent)
  const preferredText = normalizeHex(settings.theme_text, preset?.text || THEME_PRESETS.wazyo.text)
  const preferredSub = normalizeHex(settings.theme_text_sub, preset?.sub || THEME_PRESETS.wazyo.sub)

  const bgLight = relativeLuminance(bg) > 0.52
  const pageText = readableColor(preferredText, [bg])
  const pageSub = readableColor(preferredSub, [bg])
  const cardText = readableColor(preferredText, [card])
  const cardSub = readableColor(preferredSub, [card])
  const accentText = readableColor(accent, [bg, card])
  const onAccent = readableColor(DARK_TEXT, [accent])

  return {
    presetId,
    bg,
    card,
    accent,
    preferredText,
    preferredSub,
    pageText,
    pageSub,
    cardText,
    cardSub,
    accentText,
    onAccent,
    bgLight,
  }
}

export function applyWazyoThemeSettings(settings = {}) {
  const theme = resolveWazyoTheme(settings)

  if (typeof document === 'undefined') return theme

  const root = document.documentElement
  root.dataset.wazyoPreset = theme.presetId
  root.dataset.themeMode = theme.bgLight ? 'light' : 'dark'

  const variables = {
    '--bk': theme.bg,
    '--bk2': theme.bg,
    '--card': theme.card,
    '--card2': theme.card,
    '--card3': theme.card,
    '--br': theme.accent,
    '--br2': theme.accent,
    '--br3': theme.accent,
    '--g3': theme.pageText,
    '--g4': theme.pageSub,
    '--wz-page-text': theme.pageText,
    '--wz-page-sub': theme.pageSub,
    '--wz-card-text': theme.cardText,
    '--wz-card-sub': theme.cardSub,
    '--wz-accent-text': theme.accentText,
    '--wz-on-accent': theme.onAccent,
    '--wz-mode': theme.bgLight ? 'light' : 'dark',
    '--wz-page-border': theme.bgLight ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.08)',
    '--wz-soft-fill': theme.bgLight ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.035)',
  }

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  document.body.style.background = theme.bg

  try {
    localStorage.setItem('sl_theme_bg', theme.bg)
    localStorage.setItem('sl_theme_card', theme.card)
    localStorage.setItem('sl_theme_accent', theme.accent)
    localStorage.setItem('sl_theme_text', theme.preferredText)
    localStorage.setItem('sl_theme_text_sub', theme.preferredSub)
    localStorage.setItem('sl_theme_preset', theme.presetId)
  } catch {}

  return theme
}
