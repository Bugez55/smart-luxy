
import { useState, useEffect, useRef } from 'react'
import CONFIG from '../config'

// ══════════════════════════════════════════════
// BOUTON FLOTTANT WHATSAPP — bulle déplaçable
// ══════════════════════════════════════════════

const SIZE = 52
const EDGE = 12
const BOTTOM = 18
const DISMISS = 68
const DISMISS_RADIUS = 104
const DEFAULT_PHONE = '213556688810'
const WHATSAPP_MESSAGE = "Bonjour Wazyo 👋 J'aimerais avoir plus d'informations sur vos produits."

function clampPos(x, y) {
  const width = window.innerWidth
  const height = window.innerHeight

  return {
    x: Math.min(Math.max(x, 4), Math.max(4, width - SIZE - 4)),
    y: Math.min(Math.max(y, 4), Math.max(4, height - SIZE - 4)),
  }
}

function safeInsetBottom() {
  if (typeof document === 'undefined' || !document.body) return 0

  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'left:0',
    'bottom:0',
    'width:1px',
    'height:env(safe-area-inset-bottom,0px)',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';')

  document.body.appendChild(probe)
  const height = probe.getBoundingClientRect().height
  probe.remove()

  return Number.isFinite(height) ? height : 0
}

// Normalisation du numéro WhatsApp.
function normaliseWhatsAppPhone(rawPhone) {
  let digits = String(rawPhone || '').replace(/\D/g, '')

  if (/^2130[567]\d{8}$/.test(digits)) {
    digits = `213${digits.slice(4)}`
  } else if (/^0[567]\d{8}$/.test(digits)) {
    digits = `213${digits.slice(1)}`
  } else if (/^[567]\d{8}$/.test(digits)) {
    digits = `213${digits}`
  }

  if (!/^\d{8,15}$/.test(digits) || digits.startsWith('0')) {
    return DEFAULT_PHONE
  }

  return digits
}

function readSessionClosed() {
  try {
    return window.sessionStorage.getItem('wa_closed') === '1'
  } catch {
    return false
  }
}

function saveSessionClosed() {
  try {
    window.sessionStorage.setItem('wa_closed', '1')
  } catch {
    // Le bouton reste masqué dans l'état React.
  }
}

function readSavedPosition() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem('wazyo_wa_pos') || 'null'
    )

    if (
      saved &&
      Number.isFinite(saved.x) &&
      Number.isFinite(saved.y)
    ) {
      return clampPos(saved.x, saved.y)
    }
  } catch {
    // Stockage indisponible ou données invalides.
  }

  return null
}

function savePosition(position) {
  try {
    window.localStorage.setItem(
      'wazyo_wa_pos',
      JSON.stringify(position)
    )
  } catch {
    // Le déplacement reste fonctionnel.
  }
}

export default function WAButton() {
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [phone, setPhone] = useState(DEFAULT_PHONE)
  const [closed, setClosed] = useState(false)
  const [pos, setPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [overDismiss, setOverDismiss] = useState(false)

  const dragRef = useRef(null)
  const movedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const suppressClickTimerRef = useRef(null)
  const overDismissRef = useRef(false)
  const safeRef = useRef(0)

  // Initialisation.
  useEffect(() => {
    if (readSessionClosed()) {
      setClosed(true)
      return undefined
    }

    setPhone(
      normaliseWhatsAppPhone(CONFIG?.whatsapp || DEFAULT_PHONE)
    )

    safeRef.current = safeInsetBottom()
    setPos(readSavedPosition())

    const isDesktop =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 700px)').matches

    const timers = [
      window.setTimeout(() => setVisible(true), 3000),
      isDesktop ? window.setTimeout(() => setTooltip(true), 4000) : null,
      isDesktop ? window.setTimeout(() => setTooltip(false), 10000) : null,
      window.setTimeout(() => setPulse(false), 12000),
    ]

    return () => {
      timers.forEach(timer => {
        if (timer !== null) window.clearTimeout(timer)
      })

      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
    }
  }, [])

  // Adaptation au redimensionnement et à l'orientation.
  useEffect(() => {
    const onResize = () => {
      safeRef.current = safeInsetBottom()

      setPos(current =>
        current ? clampPos(current.x, current.y) : current
      )
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
    }
  }, [])

  function dismissCenter() {
    return {
      cx: window.innerWidth / 2,
      cy:
        window.innerHeight -
        BOTTOM -
        safeRef.current -
        DISMISS / 2,
    }
  }

  function nearDismiss(x, y) {
    const { cx, cy } = dismissCenter()

    return (
      Math.hypot(
        x + SIZE / 2 - cx,
        y + SIZE / 2 - cy
      ) < DISMISS_RADIUS
    )
  }

  // Début du déplacement.
  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()

    movedRef.current = false
    overDismissRef.current = false

    dragRef.current = {
      pointerId: event.pointerId,
      offX: event.clientX - rect.left,
      offY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture indisponible.
    }
  }

  // Déplacement.
  function handlePointerMove(event) {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!movedRef.current) {
      if (Math.hypot(dx, dy) < 6) return

      movedRef.current = true
      setDragging(true)
      setTooltip(false)
      setPulse(false)
    }

    const next = clampPos(
      event.clientX - drag.offX,
      event.clientY - drag.offY
    )

    const shouldDismiss = nearDismiss(next.x, next.y)

    overDismissRef.current = shouldDismiss

    setPos(next)
    setOverDismiss(shouldDismiss)
  }

  // Fin du déplacement.
  function finishDrag({ cancelled = false } = {}) {
    const wasDragging = movedRef.current
    const shouldDismiss =
      !cancelled && overDismissRef.current

    dragRef.current = null
    overDismissRef.current = false

    setDragging(false)
    setOverDismiss(false)

    if (!wasDragging) {
      movedRef.current = false
      return
    }

    // Empêcher le clic synthétique d'ouvrir WhatsApp.
    if (!cancelled) {
      suppressClickRef.current = true

      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }

      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
        suppressClickTimerRef.current = null
        movedRef.current = false
      }, 0)
    } else {
      movedRef.current = false
    }

    // Fermeture par dépôt sur la croix.
    if (shouldDismiss) {
      setClosed(true)
      saveSessionClosed()
      return
    }

    // Recollement au bord le plus proche.
    setPos(current => {
      if (!current) return current

      const width = window.innerWidth

      const next = clampPos(
        current.x + SIZE / 2 < width / 2
          ? EDGE
          : width - SIZE - EDGE,
        Math.min(
          current.y,
          window.innerHeight -
            SIZE -
            BOTTOM -
            safeRef.current
        )
      )

      savePosition(next)

      return next
    })
  }

  function handlePointerUp(event) {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    finishDrag()
  }

  function handlePointerCancel(event) {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    // Une interruption du navigateur ne ferme jamais le bouton.
    finishDrag({ cancelled: true })
  }

  // Clic WhatsApp.
  function handleClick(event) {
    if (suppressClickRef.current || movedRef.current) {
      event.preventDefault()
      event.stopPropagation()

      suppressClickRef.current = false
      movedRef.current = false

      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
        suppressClickTimerRef.current = null
      }

      return
    }

    setTooltip(false)
    setPulse(false)
  }

  // Fermeture accessible au clavier.
  function handleKeyboardDismiss() {
    setClosed(true)
    saveSessionClosed()
  }

  if (!visible || closed) return null

  const message = encodeURIComponent(WHATSAPP_MESSAGE)

  const viewportWidth =
    typeof window !== 'undefined'
      ? window.innerWidth
      : 1024

  const alignRight = pos
    ? pos.x + SIZE / 2 > viewportWidth / 2
    : true

  return (
    <>
      {dragging && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: `calc(${BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
            width: DISMISS,
            height: DISMISS,
            marginLeft: -DISMISS / 2,
            borderRadius: '50%',
            background: overDismiss
              ? 'rgba(239,68,68,.92)'
              : 'rgba(18,18,18,.9)',
            border: `1px solid ${
              overDismiss
                ? 'rgba(255,255,255,.55)'
                : 'rgba(255,255,255,.2)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1,
            opacity: overDismiss ? 1 : 0.7,
            transform: `scale(${overDismiss ? 1.08 : 0.92})`,
            transition:
              'transform .18s ease, opacity .18s ease, background .18s ease, box-shadow .18s ease',
            boxShadow: overDismiss
              ? '0 0 0 7px rgba(239,68,68,.18), 0 12px 30px rgba(0,0,0,.5)'
              : '0 12px 30px rgba(0,0,0,.5)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'dismissIn .18s ease',
          }}
        >
          ✕
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          zIndex: 9999,
          width: SIZE,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          ...(pos
            ? { left: pos.x, top: pos.y }
            : {
                right: EDGE,
                bottom: `calc(${BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
              }),
        }}
      >
        <button
          type="button"
          className="wa-accessible-dismiss"
          onClick={handleKeyboardDismiss}
          aria-label="Masquer le bouton WhatsApp pour cette session"
          title="Masquer le bouton WhatsApp"
        >
          ✕
        </button>

        {tooltip && !dragging && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              ...(alignRight ? { right: 0 } : { left: 0 }),
              width: 210,
              maxWidth: '78vw',
              background: 'rgba(14,14,14,.96)',
              color: 'var(--g3, #e0e0e0)',
              border: '1px solid rgba(201,168,76,.24)',
              borderRadius: alignRight
                ? '12px 12px 2px 12px'
                : '12px 12px 12px 2px',
              padding: '9px 28px 9px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: '0 10px 30px rgba(0,0,0,.45)',
              lineHeight: 1.4,
              backdropFilter: 'blur(10px)',
              animation: 'tooltipIn .4s ease',
            }}
          >
            <button
              type="button"
              onClick={() => setTooltip(false)}
              aria-label="Fermer le message"
              style={{
                position: 'absolute',
                top: 5,
                right: 7,
                background: 'none',
                border: 'none',
                fontSize: 11,
                color: 'rgba(255,255,255,.7)',
                cursor: 'pointer',
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>

            💬 Une question ? On est là sur WhatsApp.
          </div>
        )}

        <a
          href={`https://wa.me/${phone}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Nous écrire sur WhatsApp — appuyer ou glisser pour déplacer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#1f9d55,#157a45)',
            border: '1px solid rgba(255,255,255,.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: dragging
              ? '0 14px 34px rgba(0,0,0,.55)'
              : '0 8px 24px rgba(0,0,0,.45)',
            textDecoration: 'none',
            position: 'relative',
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            opacity: overDismiss ? 0.38 : 1,
            transform: dragging
              ? (overDismiss ? 'scale(0.8)' : 'scale(1.06)')
              : 'none',
            transition:
              'transform .16s ease, box-shadow .16s ease, opacity .16s ease',
          }}
        >
          {pulse && !dragging && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid rgba(31,157,85,.45)',
                animation: 'waPulse 1.8s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="rgba(255,255,255,.95)"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.173-1.289.173-1.413z" />

            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
          </svg>
        </a>
      </div>

      <style>{`
        .wa-accessible-dismiss {
          position: absolute;
          top: -9px;
          left: -9px;
          z-index: 2;
          width: 25px;
          height: 25px;
          border: 1px solid rgba(255,255,255,.35);
          border-radius: 50%;
          background: #222;
          color: #fff;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          opacity: 0;
          transform: scale(.85);
          pointer-events: none;
        }

        .wa-accessible-dismiss:focus-visible {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
          outline: 3px solid #d4af37;
          outline-offset: 3px;
        }

        @keyframes waPulse {
          0% { transform: scale(1); opacity: .7; }
          100% { transform: scale(1.55); opacity: 0; }
        }

        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(8px) scale(.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes dismissIn {
          from { opacity: 0; transform: scale(.7); }
          to { opacity: .7; transform: scale(.94); }
        }

        @media (max-width: 699px) {
          @keyframes waPulse {
            0% { transform: scale(1); opacity: .7; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-accessible-dismiss,
          .wa-accessible-dismiss:focus-visible {
            transition: none;
          }
        }
      `}</style>
    </>
  )
}
