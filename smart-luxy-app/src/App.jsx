import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import AnnouncementBar from './components/AnnouncementBar'
import Header from './components/Header'
import Hero from './components/Hero'
import TrustMarquee from './components/TrustMarquee'
import ProductGrid from './components/ProductGrid'
import ProductPage from './components/ProductPage'
import TrackingPage from './components/TrackingPage'
import Cart from './components/Cart'
import OrderModal from './components/OrderModal'
import SuccessScreen from './components/SuccessScreen'
import PolitiquesPage from './components/PolitiquesPage'
import AdminLogin from './components/admin/AdminLogin'
import AdminPanel from './components/admin/AdminPanel'
import { notifyTelegram, genId, alertStockBas, resumeQuotidien } from './utils/notify'
import CONFIG from './config'
import { getSettings, saveSetting } from './utils/useSettings'
import NotFound from './components/NotFound'
import WAButton from './components/WAButton'
import ProductGallery from './components/ProductGallery'
import CookieConsent from './components/CookieConsent'
import { sendCapiEvent } from './utils/api'

// ── Facebook Pixel — Tracking événements ──
function fbq(...args) {
  if (typeof window !== 'undefined' && window.fbq) window.fbq(...args)
}

const STOREFRONT_THEME_CSS = `
/* The preset changes presentation only; functional DOM and RPC logic remain untouched. */
:root[data-wazyo-preset="amazon"] { color-scheme:light; }
:root[data-wazyo-preset="minimal"] { color-scheme:light; }
:root[data-wazyo-preset="nature"] { color-scheme:light; }
:root[data-wazyo-preset="midnight"] { color-scheme:dark; }
:root[data-wazyo-preset="custom"] { color-scheme:light dark; }

:root[data-wazyo-preset="amazon"] body,
:root[data-wazyo-preset="amazon"] .app { background:#eaeded!important; color:#111827!important; font-family:Arial,Helvetica,sans-serif!important; }
:root[data-wazyo-preset="amazon"] .wz-header,
:root[data-wazyo-preset="amazon"] .wz-header--top,
:root[data-wazyo-preset="amazon"] .wz-header--scrolled { background:#131921!important; color:#fff!important; border-color:#37475a!important; box-shadow:0 1px 3px #0002!important; backdrop-filter:none!important; }
:root[data-wazyo-preset="amazon"] .wz-header::after { display:none!important; }
:root[data-wazyo-preset="amazon"] .wz-header__hint { color:#d5d9d9!important; }
:root[data-wazyo-preset="amazon"] .wz-cart { background:#232f3e!important; border:1px solid #566579!important; color:#fff!important; border-radius:5px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .wz-cart__count { background:#ff9900!important; color:#111!important; border-color:#131921!important; }
:root[data-wazyo-preset="amazon"] .wz2-logo .wz-word { color:#fff!important; }
:root[data-wazyo-preset="amazon"] .wz-hero { color:#fff!important; }
:root[data-wazyo-preset="amazon"] .wz-hero-primary { background:#ff9900!important; color:#111827!important; border-color:#ff9900!important; border-radius:5px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .wz-hero-secondary { background:#fff!important; color:#232f3e!important; border-color:#d5d9d9!important; border-radius:5px!important; }
:root[data-wazyo-preset="amazon"] .hero:not(.wz-hero) { background:#eaeded!important; color:#111827!important; }
:root[data-wazyo-preset="amazon"] .hero-badges { gap:8px!important; }
:root[data-wazyo-preset="amazon"] .hero-badge { background:#fff!important; color:#232f3e!important; border:1px solid #d5d9d9!important; border-radius:5px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .hero-badge span { color:#565959!important; }
:root[data-wazyo-preset="amazon"] .search-big { background:#fff!important; border:1px solid #888c8c!important; border-radius:7px!important; color:#232f3e!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .search-big input { color:#111827!important; background:transparent!important; }
:root[data-wazyo-preset="amazon"] .wz-categories-wrap { background:#fff!important; border-block:1px solid #d5d9d9!important; }
:root[data-wazyo-preset="amazon"] .wz-categories-label { color:#565959!important; }
:root[data-wazyo-preset="amazon"] .wz-categories-scroll .cat-btn { background:#fff!important; border:1px solid #d5d9d9!important; color:#232f3e!important; border-radius:5px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .wz-categories-scroll .cat-btn.active { background:#fff4e5!important; border-color:#ff9900!important; color:#111827!important; }
:root[data-wazyo-preset="amazon"] .wz-products-head { color:#111827!important; }
:root[data-wazyo-preset="amazon"] .wz-products-head h2 { color:#111827!important; font-size:clamp(22px,3vw,30px)!important; letter-spacing:-.02em!important; }
:root[data-wazyo-preset="amazon"] .wz-products-eyebrow { color:#c45500!important; }
:root[data-wazyo-preset="amazon"] .wz-products-count { color:#565959!important; }
:root[data-wazyo-preset="amazon"] .pgrid { gap:14px!important; }
:root[data-wazyo-preset="amazon"] .pcard { background:#fff!important; color:#111827!important; border:1px solid #d5d9d9!important; border-radius:5px!important; box-shadow:0 1px 2px #0000000d!important; transform:none!important; }
:root[data-wazyo-preset="amazon"] .pcard::after { display:none!important; }
:root[data-wazyo-preset="amazon"] .pcard-img { background:#fff!important; border-radius:4px 4px 0 0!important; }
:root[data-wazyo-preset="amazon"] .pcard-body { background:#fff!important; color:#111827!important; }
:root[data-wazyo-preset="amazon"] .pcard-name { color:#111827!important; }
:root[data-wazyo-preset="amazon"] .pcard-prix { color:#b12704!important; }
:root[data-wazyo-preset="amazon"] .pcard-old { color:#565959!important; }
:root[data-wazyo-preset="amazon"] .btn-cart { background:#fff!important; border:1px solid #888c8c!important; color:#232f3e!important; border-radius:18px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .btn-buy { background:#ffd814!important; border:1px solid #fcd200!important; color:#111827!important; border-radius:18px!important; box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .footer { background:#232f3e!important; color:#fff!important; border-color:#37475a!important; }
:root[data-wazyo-preset="amazon"] .footer a,
:root[data-wazyo-preset="amazon"] .footer button,
:root[data-wazyo-preset="amazon"] .footer .ftag { color:#fff!important; }
:root[data-wazyo-preset="amazon"] .pp-root { background:#eaeded!important; color:#111827!important; }
:root[data-wazyo-preset="amazon"] .pp-page { background:#eaeded!important; color:#111827!important; border-color:transparent!important; }
:root[data-wazyo-preset="amazon"] .pp-info,
:root[data-wazyo-preset="amazon"] .pp-section,
:root[data-wazyo-preset="amazon"] .pp-order-card,
:root[data-wazyo-preset="amazon"] .pp-section.pp-description,
:root[data-wazyo-preset="amazon"] .pp-section.pp-specs,
:root[data-wazyo-preset="amazon"] .pp-section.pp-faq { background:#fff!important; color:#111827!important; border:1px solid #d5d9d9!important; border-radius:6px!important; box-shadow:0 1px 2px #0000000d!important; }
:root[data-wazyo-preset="amazon"] .pp-title,
:root[data-wazyo-preset="amazon"] .pp-form-section-title,
:root[data-wazyo-preset="amazon"] .pp-section-title { color:#111827!important; }
:root[data-wazyo-preset="amazon"] .pp-price,
:root[data-wazyo-preset="amazon"] .pp-discount { color:#b12704!important; }
:root[data-wazyo-preset="amazon"] .pp-root input,
:root[data-wazyo-preset="amazon"] .pp-root select,
:root[data-wazyo-preset="amazon"] .pp-root textarea { background:#fff!important; color:#111827!important; border-color:#888c8c!important; border-radius:5px!important; }
:root[data-wazyo-preset="amazon"] .pp-root button { box-shadow:none!important; }
:root[data-wazyo-preset="amazon"] .pp-root .pp-sticky { background:#fff!important; border-color:#d5d9d9!important; color:#111827!important; }

:root[data-wazyo-preset="minimal"] body,
:root[data-wazyo-preset="minimal"] .app { background:#f7f9fa!important; color:#17252a!important; font-family:Inter,system-ui,-apple-system,Arial,sans-serif!important; }
:root[data-wazyo-preset="minimal"] .wz-header,
:root[data-wazyo-preset="minimal"] .wz-header--top,
:root[data-wazyo-preset="minimal"] .wz-header--scrolled { background:rgba(255,255,255,.96)!important; color:#17252a!important; border-bottom:1px solid #dfe7e8!important; box-shadow:0 2px 12px #1734380d!important; backdrop-filter:blur(14px)!important; }
:root[data-wazyo-preset="minimal"] .wz-header__hint { color:#64748b!important; }
:root[data-wazyo-preset="minimal"] .wz-cart { background:#fff!important; color:#17252a!important; border:1px solid #d1dcde!important; border-radius:12px!important; }
:root[data-wazyo-preset="minimal"] .wz-cart__count { background:#087f8c!important; color:#fff!important; }
:root[data-wazyo-preset="minimal"] .wz-hero-primary { background:#087f8c!important; color:#fff!important; border-radius:10px!important; box-shadow:none!important; }
:root[data-wazyo-preset="minimal"] .wz-hero-secondary { background:#fff!important; color:#17252a!important; border:1px solid #d1dcde!important; border-radius:10px!important; }
:root[data-wazyo-preset="minimal"] .hero:not(.wz-hero) { background:#f7f9fa!important; color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .hero-badge { background:#fff!important; color:#17252a!important; border:1px solid #dfe7e8!important; border-radius:12px!important; }
:root[data-wazyo-preset="minimal"] .hero-badge span { color:#64748b!important; }
:root[data-wazyo-preset="minimal"] .search-big { background:#fff!important; color:#17252a!important; border:1px solid #d1dcde!important; border-radius:14px!important; box-shadow:0 4px 20px #0f766e0d!important; }
:root[data-wazyo-preset="minimal"] .search-big input { color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .wz-categories-wrap { background:#f7f9fa!important; }
:root[data-wazyo-preset="minimal"] .wz-categories-label { color:#64748b!important; }
:root[data-wazyo-preset="minimal"] .wz-categories-scroll .cat-btn { background:#fff!important; color:#17252a!important; border:1px solid #d1dcde!important; border-radius:18px!important; }
:root[data-wazyo-preset="minimal"] .wz-categories-scroll .cat-btn.active { background:#087f8c!important; color:white!important; border-color:#087f8c!important; }
:root[data-wazyo-preset="minimal"] .wz-products-head h2 { color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .wz-products-eyebrow { color:#087f8c!important; }
:root[data-wazyo-preset="minimal"] .pcard { background:#fff!important; color:#17252a!important; border:1px solid #dfe7e8!important; border-radius:16px!important; box-shadow:0 5px 20px #1734380a!important; }
:root[data-wazyo-preset="minimal"] .pcard::after { display:none!important; }
:root[data-wazyo-preset="minimal"] .pcard-img { background:#fff!important; }
:root[data-wazyo-preset="minimal"] .pcard-body { background:#fff!important; color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .pcard-name { color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .pcard-prix { color:#087f8c!important; }
:root[data-wazyo-preset="minimal"] .btn-cart { background:#fff!important; color:#087f8c!important; border:1px solid #a5d0d3!important; border-radius:10px!important; }
:root[data-wazyo-preset="minimal"] .btn-buy { background:#087f8c!important; color:#fff!important; border:1px solid #087f8c!important; border-radius:10px!important; }
:root[data-wazyo-preset="minimal"] .footer { background:#e9f1f1!important; color:#17252a!important; border-color:#d1dcde!important; }
:root[data-wazyo-preset="minimal"] .footer a,
:root[data-wazyo-preset="minimal"] .footer button,
:root[data-wazyo-preset="minimal"] .footer .ftag { color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .pp-root { background:#f7f9fa!important; color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .pp-page { background:#f7f9fa!important; color:#17252a!important; border-color:transparent!important; }
:root[data-wazyo-preset="minimal"] .pp-info,
:root[data-wazyo-preset="minimal"] .pp-section,
:root[data-wazyo-preset="minimal"] .pp-order-card { background:#fff!important; color:#17252a!important; border-color:#dfe7e8!important; border-radius:14px!important; box-shadow:0 5px 20px #1734380a!important; }
:root[data-wazyo-preset="minimal"] .pp-title,
:root[data-wazyo-preset="minimal"] .pp-form-section-title,
:root[data-wazyo-preset="minimal"] .pp-section-title { color:#17252a!important; }
:root[data-wazyo-preset="minimal"] .pp-price { color:#087f8c!important; }
:root[data-wazyo-preset="minimal"] .pp-root input,
:root[data-wazyo-preset="minimal"] .pp-root select,
:root[data-wazyo-preset="minimal"] .pp-root textarea { background:#fff!important; color:#17252a!important; border-color:#cbdadb!important; border-radius:9px!important; }

:root[data-wazyo-preset="nature"] body,
:root[data-wazyo-preset="nature"] .app { background:#edf3ed!important; color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .wz-header,
:root[data-wazyo-preset="nature"] .wz-header--top,
:root[data-wazyo-preset="nature"] .wz-header--scrolled { background:#244735!important; color:#fff!important; border-color:#315a42!important; box-shadow:0 2px 12px #183d2720!important; }
:root[data-wazyo-preset="nature"] .wz-cart { background:#315a42!important; color:#fff!important; border-color:#517960!important; }
:root[data-wazyo-preset="nature"] .wz-cart__count { background:#d4e7cd!important; color:#244735!important; }
:root[data-wazyo-preset="nature"] .wz-hero-primary,
:root[data-wazyo-preset="nature"] .btn-buy { background:#26734d!important; color:#fff!important; border-color:#26734d!important; }
:root[data-wazyo-preset="nature"] .hero:not(.wz-hero) { background:#edf3ed!important; color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .search-big { background:#fff!important; color:#1d3327!important; border-color:#cdddcf!important; }
:root[data-wazyo-preset="nature"] .search-big input { color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .wz-categories-scroll .cat-btn { background:#fff!important; color:#1d3327!important; border-color:#cdddcf!important; }
:root[data-wazyo-preset="nature"] .wz-categories-scroll .cat-btn.active { background:#26734d!important; color:#fff!important; border-color:#26734d!important; }
:root[data-wazyo-preset="nature"] .pcard { background:#fff!important; color:#1d3327!important; border-color:#d5e2d5!important; border-radius:12px!important; }
:root[data-wazyo-preset="nature"] .pcard::after { display:none!important; }
:root[data-wazyo-preset="nature"] .pcard-body { background:#fff!important; color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .pcard-name { color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .pcard-prix { color:#26734d!important; }
:root[data-wazyo-preset="nature"] .btn-cart { background:#fff!important; color:#26734d!important; border-color:#b9d1bd!important; }
:root[data-wazyo-preset="nature"] .footer { background:#244735!important; color:#fff!important; }
:root[data-wazyo-preset="nature"] .footer a,:root[data-wazyo-preset="nature"] .footer button { color:#fff!important; }
:root[data-wazyo-preset="nature"] .pp-root,:root[data-wazyo-preset="nature"] .pp-page { background:#edf3ed!important; color:#1d3327!important; }
:root[data-wazyo-preset="nature"] .pp-info,:root[data-wazyo-preset="nature"] .pp-section,:root[data-wazyo-preset="nature"] .pp-order-card { background:#fff!important; color:#1d3327!important; border-color:#d5e2d5!important; }
:root[data-wazyo-preset="nature"] .pp-title,:root[data-wazyo-preset="nature"] .pp-section-title { color:#1d3327!important; }

:root[data-wazyo-preset="midnight"] body,
:root[data-wazyo-preset="midnight"] .app { background:#091321!important; color:#e8f1fb!important; }
:root[data-wazyo-preset="midnight"] .wz-header,
:root[data-wazyo-preset="midnight"] .wz-header--top,
:root[data-wazyo-preset="midnight"] .wz-header--scrolled { background:#101c2d!important; border-color:#263b54!important; }
:root[data-wazyo-preset="midnight"] .wz-cart { background:#16263b!important; color:#e8f1fb!important; border-color:#2a435d!important; }
:root[data-wazyo-preset="midnight"] .wz-hero-primary,:root[data-wazyo-preset="midnight"] .btn-buy { background:#38bdf8!important; color:#071321!important; border-color:#38bdf8!important; }
:root[data-wazyo-preset="midnight"] .wz-categories-scroll .cat-btn { background:#122033!important; color:#dce8f6!important; border-color:#263b54!important; }
:root[data-wazyo-preset="midnight"] .wz-categories-scroll .cat-btn.active { background:#38bdf8!important; color:#071321!important; border-color:#38bdf8!important; }
:root[data-wazyo-preset="midnight"] .pcard { background:#122033!important; color:#e8f1fb!important; border-color:#263b54!important; }
:root[data-wazyo-preset="midnight"] .pcard-body { background:#122033!important; color:#e8f1fb!important; }
:root[data-wazyo-preset="midnight"] .pcard-name { color:#e8f1fb!important; }
:root[data-wazyo-preset="midnight"] .pcard-prix { color:#38bdf8!important; }
:root[data-wazyo-preset="midnight"] .btn-cart { background:#16263b!important; color:#e8f1fb!important; border-color:#2a435d!important; }
:root[data-wazyo-preset="midnight"] .pp-root,:root[data-wazyo-preset="midnight"] .pp-page { background:#091321!important; color:#e8f1fb!important; }
:root[data-wazyo-preset="midnight"] .pp-info,:root[data-wazyo-preset="midnight"] .pp-section,:root[data-wazyo-preset="midnight"] .pp-order-card { background:#122033!important; color:#e8f1fb!important; border-color:#263b54!important; }
:root[data-wazyo-preset="midnight"] .pp-title,:root[data-wazyo-preset="midnight"] .pp-section-title { color:#e8f1fb!important; }

/* CINEMATIC — layout genuinely different, not just a color palette. */
:root[data-wazyo-preset="cinematic"] { color-scheme:dark; }
:root[data-wazyo-preset="cinematic"] body,
:root[data-wazyo-preset="cinematic"] .app { background:#080a0f!important; color:#f7f4ed!important; font-family:Inter, ui-sans-serif, system-ui, -apple-system, sans-serif!important; }
:root[data-wazyo-preset="cinematic"] .wz-header,
:root[data-wazyo-preset="cinematic"] .wz-header--top,
:root[data-wazyo-preset="cinematic"] .wz-header--scrolled { background:rgba(8,10,15,.86)!important; color:#f7f4ed!important; border-color:rgba(213,183,112,.2)!important; box-shadow:0 10px 35px rgba(0,0,0,.2)!important; backdrop-filter:blur(18px)!important; }
:root[data-wazyo-preset="cinematic"] .wz-header__hint { color:#c6c2b9!important; }
:root[data-wazyo-preset="cinematic"] .wz-cart { background:rgba(255,255,255,.07)!important; color:#fff!important; border:1px solid rgba(213,183,112,.35)!important; border-radius:999px!important; box-shadow:none!important; }
:root[data-wazyo-preset="cinematic"] .wz-cart__count { background:#d5b770!important; color:#111!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero { height:min(900px,94svh)!important; min-height:min(760px,90svh)!important; background:#080a0f!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-media { inset:0!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-image,
:root[data-wazyo-preset="cinematic"] .wz-hero-video { opacity:.18!important; filter:brightness(.75) saturate(.65)!important; transform:scale(1.07)!important; animation:wzCinemaKenBurns 26s ease-in-out infinite alternate!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-image.is-loaded,
:root[data-wazyo-preset="cinematic"] .wz-hero-video.is-loaded { opacity:.60!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-overlay { background:linear-gradient(90deg,rgba(5,6,10,.90) 0%,rgba(5,6,10,.56) 40%,rgba(5,6,10,.18) 75%,rgba(5,6,10,.35) 100%),linear-gradient(0deg,#080a0f 0%,rgba(8,10,15,.12) 34%,rgba(8,10,15,.15) 100%)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-glow { opacity:.18!important; background:radial-gradient(ellipse at 50% 45%,rgba(213,183,112,.28),transparent 58%)!important; animation:wzCinemaGlow 8s ease-in-out infinite alternate!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-inner { justify-content:center!important; width:min(1200px,calc(100% - 36px))!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-content { width:min(920px,100%)!important; margin:0 auto!important; text-align:center!important; padding:64px 0 70px!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker,
:root[data-wazyo-preset="cinematic"] .wz-hero-actions,
:root[data-wazyo-preset="cinematic"] .wz-hero-trust,
:root[data-wazyo-preset="cinematic"] .wz-hero-note { justify-content:center!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker { color:#ded5c1!important; letter-spacing:.24em!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker-line { background:#d5b770!important; box-shadow:0 0 22px rgba(213,183,112,.55)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-title { max-width:100%!important; font-size:clamp(48px,9.5vw,112px)!important; line-height:.91!important; letter-spacing:-.065em!important; text-shadow:0 14px 48px #0008!important; animation:wzCinemaTitle .9s .08s both!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-title span { color:#e0c783!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-subtitle { margin:28px auto 0!important; max-width:620px!important; color:rgba(248,246,239,.76)!important; font-size:clamp(14px,1.5vw,17px)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-primary { background:linear-gradient(135deg,#f0d992,#b99146)!important; color:#14120d!important; border:1px solid #efd38c!important; border-radius:999px!important; box-shadow:0 12px 44px rgba(201,168,76,.20)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-secondary { border:1px solid rgba(255,255,255,.28)!important; background:rgba(255,255,255,.07)!important; color:#fff!important; border-radius:999px!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-trust { color:rgba(255,255,255,.62)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-trust strong { color:#f0d992!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-note { color:rgba(255,255,255,.42)!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-note-dot { background:#d5b770!important; }
:root[data-wazyo-preset="cinematic"] .wz-hero-scroll { color:rgba(255,255,255,.56)!important; }
:root[data-wazyo-preset="cinematic"] .hero:not(.wz-hero) { background:#080a0f!important; color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .hero-badge { background:rgba(255,255,255,.045)!important; border:1px solid rgba(213,183,112,.2)!important; color:#f2ede2!important; border-radius:999px!important; }
:root[data-wazyo-preset="cinematic"] .hero-badge span { color:#bbb2a0!important; }
:root[data-wazyo-preset="cinematic"] .search-big { background:#11151e!important; border:1px solid rgba(213,183,112,.25)!important; border-radius:16px!important; box-shadow:0 12px 45px #0003!important; color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .search-big input { background:transparent!important; color:#fff!important; }
:root[data-wazyo-preset="cinematic"] .wz-categories-wrap { background:#0b0e14!important; border-block:1px solid rgba(213,183,112,.12)!important; }
:root[data-wazyo-preset="cinematic"] .wz-categories-label { color:#bcb3a1!important; }
:root[data-wazyo-preset="cinematic"] .wz-categories-scroll .cat-btn { background:#11151e!important; color:#e9e2d4!important; border:1px solid rgba(255,255,255,.10)!important; border-radius:999px!important; }
:root[data-wazyo-preset="cinematic"] .wz-categories-scroll .cat-btn.active { background:#d5b770!important; color:#15130e!important; border-color:#d5b770!important; }
:root[data-wazyo-preset="cinematic"] .wz-products-head { color:#f6f0e4!important; }
:root[data-wazyo-preset="cinematic"] .wz-products-head h2 { font-size:clamp(26px,4vw,42px)!important; letter-spacing:-.045em!important; }
:root[data-wazyo-preset="cinematic"] .wz-products-eyebrow { color:#d5b770!important; letter-spacing:.20em!important; }
:root[data-wazyo-preset="cinematic"] .pgrid { gap:16px!important; }
:root[data-wazyo-preset="cinematic"] .pcard { background:linear-gradient(160deg,#171a22,#101219)!important; color:#f7f4ed!important; border:1px solid rgba(213,183,112,.18)!important; border-radius:15px!important; box-shadow:0 12px 35px rgba(0,0,0,.18)!important; overflow:hidden!important; animation:wzCinemaCard .65s both!important; }
:root[data-wazyo-preset="cinematic"] .pcard:nth-child(3n+2) { animation-delay:.08s!important; }
:root[data-wazyo-preset="cinematic"] .pcard:nth-child(3n) { animation-delay:.16s!important; }
:root[data-wazyo-preset="cinematic"] .pcard::after { display:none!important; }
:root[data-wazyo-preset="cinematic"] .pcard-img { background:#0d1017!important; }
:root[data-wazyo-preset="cinematic"] .pcard-img img { transition:transform .7s cubic-bezier(.2,.7,.3,1),filter .5s ease!important; }
:root[data-wazyo-preset="cinematic"] .pcard:hover .pcard-img img { transform:scale(1.045)!important; filter:saturate(1.08)!important; }
:root[data-wazyo-preset="cinematic"] .pcard-body { background:transparent!important; color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .pcard-name { color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .pcard-prix { color:#e0c783!important; }
:root[data-wazyo-preset="cinematic"] .pcard-old { color:#a6a29a!important; }
:root[data-wazyo-preset="cinematic"] .btn-cart { background:rgba(255,255,255,.05)!important; border:1px solid rgba(213,183,112,.28)!important; color:#f7f4ed!important; border-radius:999px!important; }
:root[data-wazyo-preset="cinematic"] .btn-buy { background:linear-gradient(135deg,#f0d992,#b99146)!important; border:1px solid #d5b770!important; color:#14120d!important; border-radius:999px!important; }
:root[data-wazyo-preset="cinematic"] .footer { background:#090b10!important; color:#f7f4ed!important; border-color:rgba(213,183,112,.16)!important; }
:root[data-wazyo-preset="cinematic"] .footer a,:root[data-wazyo-preset="cinematic"] .footer button,:root[data-wazyo-preset="cinematic"] .footer .ftag { color:#e8d7ad!important; }
:root[data-wazyo-preset="cinematic"] .pp-root,:root[data-wazyo-preset="cinematic"] .pp-page { background:#080a0f!important; color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .pp-info,:root[data-wazyo-preset="cinematic"] .pp-section,:root[data-wazyo-preset="cinematic"] .pp-order-card { background:#11151e!important; color:#f7f4ed!important; border:1px solid rgba(213,183,112,.18)!important; border-radius:15px!important; box-shadow:0 14px 42px rgba(0,0,0,.2)!important; }
:root[data-wazyo-preset="cinematic"] .pp-title,:root[data-wazyo-preset="cinematic"] .pp-form-section-title,:root[data-wazyo-preset="cinematic"] .pp-section-title { color:#f7f4ed!important; }
:root[data-wazyo-preset="cinematic"] .pp-price,:root[data-wazyo-preset="cinematic"] .pp-discount { color:#e0c783!important; }
:root[data-wazyo-preset="cinematic"] .pp-root input,:root[data-wazyo-preset="cinematic"] .pp-root select,:root[data-wazyo-preset="cinematic"] .pp-root textarea { background:#090c12!important; color:#f7f4ed!important; border-color:rgba(213,183,112,.22)!important; }
@keyframes wzCinemaKenBurns { 0% { transform:scale(1.04) translate3d(-.4%,0,0); } 100% { transform:scale(1.15) translate3d(.8%,-.4%,0); } }
@keyframes wzCinemaGlow { 0% { opacity:.12; transform:scale(.95); } 100% { opacity:.32; transform:scale(1.08); } }
@keyframes wzCinemaTitle { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@keyframes wzCinemaCard { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@media (prefers-reduced-motion:reduce) {
  :root[data-wazyo-preset="cinematic"] .wz-hero-image,:root[data-wazyo-preset="cinematic"] .wz-hero-video,:root[data-wazyo-preset="cinematic"] .wz-hero-glow,:root[data-wazyo-preset="cinematic"] .wz-hero-title,:root[data-wazyo-preset="cinematic"] .pcard { animation:none!important; }
}


/* WAZYO 2026 editorial layout — override older centered cinematic preset. */
.wz-collection-anchor{height:1px;scroll-margin-top:92px;}
:root[data-wazyo-preset="cinematic"] .wz-hero{
  height:min(690px,80svh)!important;
  min-height:520px!important;
  max-height:760px!important;
  background:#080a0f!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-image,
:root[data-wazyo-preset="cinematic"] .wz-hero-video{
  opacity:.58!important;
  filter:brightness(.88) saturate(.82) contrast(1.05)!important;
  transform:scale(1.045)!important;
  animation:wzCinemaKenBurns 28s ease-in-out infinite alternate!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-image.is-loaded,
:root[data-wazyo-preset="cinematic"] .wz-hero-video.is-loaded{
  opacity:.78!important;
  filter:brightness(.94) saturate(.9) contrast(1.04)!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-overlay{
  background:
    linear-gradient(90deg,rgba(5,6,10,.96) 0%,rgba(5,6,10,.88) 29%,rgba(5,6,10,.52) 53%,rgba(5,6,10,.08) 100%),
    linear-gradient(0deg,#080a0f 0%,rgba(8,10,15,.10) 44%,rgba(8,10,15,.14) 100%)!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero.has-custom-media .wz-hero-overlay{
  background:
    linear-gradient(90deg,rgba(5,6,10,.94) 0%,rgba(5,6,10,.82) 30%,rgba(5,6,10,.44) 56%,rgba(5,6,10,.06) 100%),
    linear-gradient(0deg,rgba(8,10,15,.44) 0%,transparent 54%,rgba(8,10,15,.12) 100%)!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-inner{
  justify-content:flex-start!important;
  width:min(1320px,calc(100% - 72px))!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-content{
  width:min(690px,60%)!important;
  margin:0!important;
  text-align:left!important;
  padding:58px 0 72px!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker,
:root[data-wazyo-preset="cinematic"] .wz-hero-actions,
:root[data-wazyo-preset="cinematic"] .wz-hero-highlights{
  justify-content:flex-start!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker{
  color:#e2ca91!important;
  letter-spacing:.19em!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker-line{
  background:#d5b770!important;
  box-shadow:0 0 18px rgba(213,183,112,.40)!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-title{
  max-width:740px!important;
  font-size:clamp(48px,6.2vw,84px)!important;
  line-height:.97!important;
  letter-spacing:-.065em!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-title span{
  color:#e0c27d!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-subtitle{
  margin:22px 0 0!important;
  max-width:520px!important;
  color:rgba(248,246,239,.78)!important;
  font-size:15px!important;
  line-height:1.72!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-highlights{
  color:rgba(247,244,237,.70)!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-highlights i{
  color:#d5b770!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-primary{
  background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%)!important;
  color:#15130e!important;
  border:1px solid #e4ca8d!important;
  border-radius:10px!important;
  box-shadow:0 12px 32px rgba(0,0,0,.22)!important;
}
:root[data-wazyo-preset="cinematic"] .footer{
  width:min(1320px,100%)!important;
  max-width:1320px!important;
  margin:0 auto!important;
  padding:44px clamp(16px,3vw,32px) 32px!important;
  gap:12px!important;
  background:linear-gradient(180deg,#0b0e14 0%,#080a0f 100%)!important;
  border-top:1px solid rgba(213,183,112,.22)!important;
}
:root[data-wazyo-preset="cinematic"] .footer::before{
  width:min(420px,55vw)!important;
  background:linear-gradient(90deg,transparent,#d5b770,transparent)!important;
}
:root[data-wazyo-preset="cinematic"] .footer .fbn{
  color:#f7f4ed!important;
  font-family:'Outfit',system-ui,sans-serif!important;
  font-size:30px!important;
  font-weight:850!important;
  letter-spacing:.12em!important;
  text-transform:uppercase!important;
}
:root[data-wazyo-preset="cinematic"] .footer .ftag{
  color:rgba(247,244,237,.56)!important;
  font-size:11px!important;
  letter-spacing:.12em!important;
}
:root[data-wazyo-preset="cinematic"] .footer a,
:root[data-wazyo-preset="cinematic"] .footer button{
  color:#dfc783!important;
}
:root[data-wazyo-preset="cinematic"] .footer a:hover,
:root[data-wazyo-preset="cinematic"] .footer button:hover{
  color:#fff!important;
}
@media(max-width:820px){
  :root[data-wazyo-preset="cinematic"] .wz-hero{
    height:min(720px,82svh)!important;
    min-height:560px!important;
    max-height:760px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-inner{
    width:calc(100% - 42px)!important;
    align-items:center!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-content{
    width:min(620px,88%)!important;
    padding:40px 0 64px!important;
    text-align:left!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-image,
  :root[data-wazyo-preset="cinematic"] .wz-hero-video{
    object-position:66% center!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-overlay{
    background:
      linear-gradient(180deg,rgba(5,6,10,.12) 0%,rgba(5,6,10,.36) 34%,rgba(5,6,10,.92) 100%),
      linear-gradient(90deg,rgba(5,6,10,.24),rgba(5,6,10,.06))!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-title{
    font-size:clamp(46px,9vw,72px)!important;
    text-align:left!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-subtitle{
    margin:17px 0 0!important;
    text-align:left!important;
  }
}
@media(max-width:520px){
  :root[data-wazyo-preset="cinematic"] .wz-hero{
    height:min(690px,82svh)!important;
    min-height:550px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-inner{
    width:calc(100% - 34px)!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-content{
    width:100%!important;
    padding:30px 0 50px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-title{
    font-size:clamp(41px,11.8vw,58px)!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-highlights{
    flex-wrap:wrap!important;
    gap:7px!important;
    font-size:8px!important;
  }
  :root[data-wazyo-preset="cinematic"] .footer{
    padding:30px 14px 24px!important;
  }
}
 
/* Robust token-based fallback: works even on components without a theme-specific class. */
:root[data-wazyo-preset="custom"] body,
:root[data-wazyo-preset="custom"] .app {
  background:var(--bk)!important;
  color:var(--g3)!important;
}
:root[data-wazyo-preset="custom"] .pcard,
:root[data-wazyo-preset="custom"] .pp-info,
:root[data-wazyo-preset="custom"] .pp-section,
:root[data-wazyo-preset="custom"] .pp-order-card {
  background:var(--card)!important;
  color:var(--wz-card-text,var(--g3))!important;
  border-color:var(--wz-page-border,rgba(127,127,127,.22))!important;
}
:root[data-wazyo-preset="custom"] .pcard-name,
:root[data-wazyo-preset="custom"] .pp-title,
:root[data-wazyo-preset="custom"] .pp-section-title {
  color:var(--wz-card-text,var(--g3))!important;
}
:root[data-wazyo-preset="custom"] .pcard-prix,
:root[data-wazyo-preset="custom"] .pp-price,
:root[data-wazyo-preset="custom"] .wz-products-eyebrow {
  color:var(--br)!important;
}
:root[data-wazyo-preset="custom"] .pcard-old,
:root[data-wazyo-preset="custom"] .wz-products-count {
  color:var(--wz-card-sub,var(--g4))!important;
}
:root[data-wazyo-preset="custom"] .pp-root input,
:root[data-wazyo-preset="custom"] .pp-root select,
:root[data-wazyo-preset="custom"] .pp-root textarea,
:root[data-wazyo-preset="custom"] .search-big {
  background:var(--card)!important;
  color:var(--wz-card-text,var(--g3))!important;
  border-color:var(--wz-page-border,rgba(127,127,127,.22))!important;
}
:root[data-wazyo-preset="custom"] .btn-buy,
:root[data-wazyo-preset="custom"] .wz-hero-primary {
  background:var(--br)!important;
  color:var(--bk)!important;
  border-color:var(--br)!important;
}


/* WAZYO editorial composition — final overrides for the active cinematic preset. */
:root[data-wazyo-preset="cinematic"] .wz-hero{
  height:auto!important;
  min-height:620px!important;
  max-height:none!important;
  overflow:hidden!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-inner{
  display:grid!important;
  grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;
  align-items:center!important;
  justify-content:initial!important;
  gap:clamp(24px,3.4vw,48px)!important;
  width:min(1340px,calc(100% - 68px))!important;
  height:auto!important;
  min-height:620px!important;
  margin:0 auto!important;
  padding:34px 0!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-content{
  width:100%!important;
  max-width:620px!important;
  margin:0!important;
  padding:42px 0!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-title{
  max-width:720px!important;
  font-size:clamp(48px,5.3vw,78px)!important;
  line-height:.99!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-subtitle{
  max-width:540px!important;
  margin:21px 0 0!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-kicker,
:root[data-wazyo-preset="cinematic"] .wz-hero-actions,
:root[data-wazyo-preset="cinematic"] .wz-hero-highlights{
  justify-content:flex-start!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-stage{
  width:100%!important;
  max-width:670px!important;
  margin-left:auto!important;
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-product-grid{
  grid-template-rows:172px 172px!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-product-info{
  text-align:left!important;
}
:root[data-wazyo-preset="cinematic"] .wz-hero-primary{
  background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%)!important;
  color:#15130e!important;
  border:1px solid #e4ca8d!important;
  border-radius:10px!important;
}
:root[data-wazyo-preset="cinematic"] .wz-trust-marquee{
  width:min(1320px,calc(100% - 52px))!important;
  max-width:1320px!important;
  margin:-1px auto 0!important;
}
:root[data-wazyo-preset="cinematic"] .wz-trust-inner{
  width:100%!important;
  min-height:86px!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
}
:root[data-wazyo-preset="cinematic"] .wz-trust-item{
  flex-direction:row!important;
  align-items:center!important;
  justify-content:center!important;
}
:root[data-wazyo-preset="cinematic"] .wz-editorial-section{
  color:#f7f4ed!important;
}
:root[data-wazyo-preset="cinematic"] .wz-editorial-card{
  background:linear-gradient(145deg,#191d26,#090b10)!important;
  border-color:rgba(213,183,112,.26)!important;
}
@media(max-width:1100px){
  :root[data-wazyo-preset="cinematic"] .wz-hero-inner{
    grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr)!important;
    gap:22px!important;
    width:calc(100% - 42px)!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-stage{
    padding:17px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-product-grid{
    grid-template-rows:155px 155px!important;
  }
}
@media(max-width:820px){
  :root[data-wazyo-preset="cinematic"] .wz-hero{
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow:hidden!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-inner{
    display:grid!important;
    grid-template-columns:minmax(0,1fr)!important;
    align-items:stretch!important;
    justify-content:initial!important;
    gap:24px!important;
    width:min(700px,calc(100% - 36px))!important;
    min-height:0!important;
    height:auto!important;
    padding:36px 0 30px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-content{
    width:100%!important;
    max-width:620px!important;
    padding:10px 0 0!important;
    text-align:left!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-title{
    font-size:clamp(46px,8.5vw,68px)!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-stage{
    width:100%!important;
    max-width:none!important;
    margin:0!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-trust-inner{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    min-height:0!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-trust-item{
    justify-content:flex-start!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-trust-item:nth-child(2) .wz-trust-divider{
    display:none!important;
  }
}
@media(max-width:520px){
  :root[data-wazyo-preset="cinematic"] .wz-hero-inner{
    width:calc(100% - 28px)!important;
    gap:20px!important;
    padding:28px 0 24px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-content{
    width:100%!important;
    padding:6px 0 0!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-title{
    font-size:clamp(40px,11.3vw,56px)!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-subtitle{
    margin:15px 0 0!important;
    font-size:13px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-stage{
    padding:12px!important;
    border-radius:17px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-hero-product-grid{
    grid-template-rows:150px 150px!important;
    gap:8px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-trust-marquee{
    width:calc(100% - 24px)!important;
    border-radius:0 0 13px 13px!important;
  }
  :root[data-wazyo-preset="cinematic"] .wz-trust-inner{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    min-height:0!important;
  }
}

`;

function applyWazyoThemeSettings(s) {
  const root = document.documentElement
  const modes = {
    wazyo:   { bg:'#0a0a0a', card:'#141414', accent:'#C9A84C', text:'#e0e0e0', sub:'#888888' },
    amazon:  { bg:'#eaeded', card:'#ffffff', accent:'#ff9900', text:'#111827', sub:'#565959' },
    minimal: { bg:'#f7f9fa', card:'#ffffff', accent:'#087f8c', text:'#17252a', sub:'#64748b' },
    nature:  { bg:'#edf3ed', card:'#ffffff', accent:'#26734d', text:'#1d3327', sub:'#687b70' },
    midnight:{ bg:'#091321', card:'#122033', accent:'#38bdf8', text:'#e8f1fb', sub:'#9db1c8' },
    cinematic:{ bg:'#080a0f', card:'#11151e', accent:'#d5b770', text:'#f7f4ed', sub:'#aaa398' },
  }
  const savedPreset = String(s?.theme_preset || 'cinematic').toLowerCase()
  const presetId = ['wazyo','amazon','minimal','nature','midnight','cinematic'].includes(savedPreset) ? savedPreset : 'custom'
  const preset = modes[presetId]
  const bg = preset?.bg || s?.theme_bg || localStorage.getItem('sl_theme_bg') || '#0a0a0a'
  const card = preset?.card || s?.theme_card || localStorage.getItem('sl_theme_card') || '#141414'
  const accent = preset?.accent || s?.theme_accent || localStorage.getItem('sl_theme_accent') || '#C9A84C'
  const text = preset?.text || s?.theme_text || localStorage.getItem('sl_theme_text') || '#e0e0e0'
  const sub = preset?.sub || s?.theme_text_sub || localStorage.getItem('sl_theme_text_sub') || '#888888'
  const hexToRgb = (hex) => {
    let h = String(hex || '').trim().replace('#','')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0,0,0]
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]
  }
  const lum = hex => {
    const rgb = hexToRgb(hex).map(v => { const x=v/255; return x<=.03928 ? x/12.92 : Math.pow((x+.055)/1.055,2.4) })
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
  }
  const bgLight = lum(bg) > .52
  const cardText = lum(card) > .52 ? '#171717' : '#f7f7f7'
  const cardSub = lum(card) > .52 ? '#666666' : '#bdbdbd'
  root.dataset.wazyoPreset = presetId
  root.dataset.themeMode = bgLight ? 'light' : 'dark'
  const vars = {
    '--bk':bg,'--bk2':bg,'--card':card,'--card2':card,'--card3':card,
    '--br':accent,'--br2':accent,'--br3':accent,'--g3':text,'--g4':sub,
    '--wz-card-text':cardText,'--wz-card-sub':cardSub,
    '--wz-mode':bgLight?'light':'dark',
    '--wz-page-border':bgLight?'rgba(0,0,0,.10)':'rgba(255,255,255,.08)',
    '--wz-soft-fill':bgLight?'rgba(0,0,0,.035)':'rgba(255,255,255,.035)',
  }
  Object.entries(vars).forEach(([key,value])=>root.style.setProperty(key,value))
  document.body.style.background = bg
  try {
    localStorage.setItem('sl_theme_bg',bg)
    localStorage.setItem('sl_theme_card',card)
    localStorage.setItem('sl_theme_accent',accent)
    localStorage.setItem('sl_theme_text',text)
    localStorage.setItem('sl_theme_text_sub',sub)
    localStorage.setItem('sl_theme_preset',presetId)
  } catch {}
}


export default function App() {

  const [isNotFound] = useState(() => {
    const path = window.location.pathname
    return path !== '/' && path !== '' && !path.startsWith('/#')
  })

  const [isAdmin] = useState(() => window.location.search.includes('admin'))
  const [adminAuth, setAdminAuth] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [cart, setCart] = useState([])
  const [activeCat, setActiveCat] = useState('Tous')
  const [search, setSearch] = useState('')
  const [openProduct, setOpenProduct] = useState(null)
  const [checkoutProduct, setCheckoutProduct] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [promoInfo, setPromoInfo] = useState(null)
  const [affiliateOffer, setAffiliateOffer] = useState(null)
  const [heroSettings, setHeroSettings] = useState({ url: '', type: '' })
  const [orderItems, setOrderItems] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [toasts, setToasts] = useState([])
  const [politiqueTab, setPolitiqueTab] = useState(null)

  // ── Mode maintenance (piloté par le réglage Supabase) ──
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceChecked, setMaintenanceChecked] = useState(false)

  useEffect(() => {
    let mounted = true
    getSettings().then(s => {
      if (!mounted) return
      setMaintenanceMode(String(s?.maintenance || 'false').toLowerCase() === 'true')
      setHeroSettings({
        url: String(s?.hero_media_url || '').trim(),
        type: String(s?.hero_media_type || '').trim().toLowerCase(),
      })
      setMaintenanceChecked(true)
    }).catch(err => {
      // En cas d'erreur de lecture des settings, ne jamais bloquer la boutique.
      console.error('maintenance settings:', err)
      if (mounted) {
        setMaintenanceMode(false)
        setHeroSettings({ url: '', type: '' })
        setMaintenanceChecked(true)
      }
    })
    return () => { mounted = false }
  }, [])

  // Mise à jour du visuel Hero si l'admin publie depuis un autre onglet.
  // Le rechargement au focus couvre aussi les cas où les événements storage sont bloqués.
  useEffect(() => {
    let mounted = true

    const applyPayload = (raw) => {
      try {
        const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!payload || typeof payload !== 'object') return
        setHeroSettings({
          url: String(payload.url || '').trim(),
          type: String(payload.type || '').trim().toLowerCase(),
        })
      } catch (error) {
        console.warn('Mise à jour Hero ignorée :', error)
      }
    }

    const onStorage = (event) => {
      if (event.key === 'wazyo_hero_media_updated' && event.newValue) {
        applyPayload(event.newValue)
      }
    }

    const refreshHeroFromSupabase = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['hero_media_url', 'hero_media_type'])
      if (!mounted || error || !data) return
      const rows = Object.fromEntries(data.map(row => [row.key, row.value]))
      setHeroSettings({
        url: String(rows.hero_media_url || '').trim(),
        type: String(rows.hero_media_type || '').trim().toLowerCase(),
      })
    }

    const onFocus = () => { refreshHeroFromSupabase() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    setProducts(data || [])
    setLoading(false)
  }, [])

  // ── Chargement produits + ouverture directe + affiliation ──
  useEffect(() => {
    let cancelled = false

    async function init() {
      await loadProducts()

      // Les anciennes versions conservaient la remise dans localStorage,
      // ce qui la faisait réapparaître lors de visites ultérieures sans lien.
      try { localStorage.removeItem('wazyo_affiliate_offer') } catch {}

      try {
        const searchParams = new URLSearchParams(window.location.search)
        const refCode = String(searchParams.get('ref') || '').trim().toUpperCase()
        let offerData = null

        if (refCode) {
          // Même visiteur = même clé persistante. Le RPC compte au maximum
          // un clic unique par lien et par jour.
          let visitorKey = localStorage.getItem('wazyo_affiliate_visitor_key')
          if (!visitorKey) {
            visitorKey = window.crypto?.randomUUID
              ? window.crypto.randomUUID()
              : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
            localStorage.setItem('wazyo_affiliate_visitor_key', visitorKey)
          }

          const { data, error } = await supabase.rpc('track_affiliate_click', {
            p_code: refCode,
            p_visitor_key: visitorKey,
          })

          if (error) {
            console.error('Suivi du clic influenceur :', error)
            // Si le suivi du clic échoue, on vérifie tout de même si le lien
            // est valide afin de ne pas bloquer la remise pour le client.
            const fallback = await supabase.rpc('get_affiliate_link', { p_code: refCode })
            if (!fallback.error) offerData = fallback.data
          } else {
            offerData = data
          }

          if (offerData?.code) {
            sessionStorage.setItem('wazyo_affiliate_offer', JSON.stringify({ ...offerData, _saved_at: Date.now() }))
          } else {
            sessionStorage.removeItem('wazyo_affiliate_offer')
          }
        } else {
          // Conserver l'offre après navigation/rechargement, mais revalider
          // son statut et ses dates côté serveur à chaque démarrage.
          let savedOffer = null
          try {
            savedOffer = JSON.parse(sessionStorage.getItem('wazyo_affiliate_offer') || 'null')
          } catch {
            savedOffer = null
          }

          const savedAt = Number(savedOffer?._saved_at || 0)
          const offerExpired = !savedAt || (Date.now() - savedAt > 24 * 60 * 60 * 1000)

          if (savedOffer?.code && !offerExpired) {
            const { data, error } = await supabase.rpc('get_affiliate_link', {
              p_code: savedOffer.code,
            })
            if (!error && data?.code) {
              offerData = data
              sessionStorage.setItem('wazyo_affiliate_offer', JSON.stringify({ ...data, _saved_at: savedAt }))
            } else {
              sessionStorage.removeItem('wazyo_affiliate_offer')
            }
          } else {
            // Ne jamais réutiliser éternellement une ancienne offre.
            sessionStorage.removeItem('wazyo_affiliate_offer')
          }
        }

        if (!cancelled) setAffiliateOffer(offerData?.code ? offerData : null)
      } catch (e) {
        console.error('Initialisation affiliation :', e)
      }

      // Lire le hash APRÈS le chargement des produits et du lien.
      const hash = window.location.hash
      if (hash.startsWith('#produit-')) {
        const productId = hash.replace('#produit-', '')
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()
        if (!cancelled && data) setOpenProduct(data)
      }
    }

    init().catch(e => console.error('Initialisation boutique :', e))
    return () => { cancelled = true }
  }, [loadProducts])

  // ── Retour Android / navigateur : restaurer la vue qui était derrière le formulaire ──
  useEffect(() => {
    function handlePopState() {
      const state = window.history.state || {}
      const hash = window.location.hash

      if (state.wazyoModal === 'cart') {
        setCartOpen(true)
        setOpenProduct(null)
        setCheckoutProduct(null)
        return
      }

      setCartOpen(false)

      if (state.wazyoModal === 'product' || state.wazyoModal === 'checkout') {
        const productId = String(state.wazyoProductId || '')
        const product = products.find(item => String(item.id) === productId) || null
        setOpenProduct(state.wazyoModal === 'product' ? product : null)
        setCheckoutProduct(state.wazyoModal === 'checkout' ? product : null)
        return
      }

      if (hash.startsWith('#panier')) {
        setCartOpen(true)
        setOpenProduct(null)
        setCheckoutProduct(null)
        return
      }

      if (hash.startsWith('#produit-')) {
        const productId = decodeURIComponent(hash.slice('#produit-'.length))
        const product = products.find(item => String(item.id) === productId) || null
        setOpenProduct(product)
        setCheckoutProduct(null)
        return
      }

      if (hash.startsWith('#commande-')) {
        const productId = decodeURIComponent(hash.slice('#commande-'.length))
        const product = products.find(item => String(item.id) === productId) || null
        setCheckoutProduct(product)
        setOpenProduct(null)
        return
      }

      setOpenProduct(null)
      setCheckoutProduct(null)
      setCartOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [products])

  // ── Appliquer le thème global sauvegardé ──
  useEffect(() => {
    let mounted = true
    const refreshTheme = async () => {
      try {
        // Lire directement les paramètres de thème, sans le cache général
        // de getSettings (TTL 2 minutes), pour appliquer le choix fraîchement publié.
        const keys = ['theme_preset','theme_bg','theme_card','theme_accent','theme_text','theme_text_sub']
        const { data, error } = await supabase
          .from('settings')
          .select('key,value')
          .in('key', keys)
        if (error) throw error
        const fresh = Object.fromEntries((data || []).map(row => [row.key, row.value]))
        if (mounted) applyWazyoThemeSettings(fresh)
      } catch (e) {
        console.warn('Chargement du thème ignoré :', e)
      }
    }
    refreshTheme()
    const onStorage = (event) => {
      if (event.key === 'wazyo_theme_updated' || event.key === 'wazyo_theme_updated_at') refreshTheme()
    }
    const onThemeEvent = () => refreshTheme()
    const onFocus = () => refreshTheme()
    const onPageShow = () => refreshTheme()

    window.addEventListener('storage', onStorage)
    window.addEventListener('wazyo:theme-updated', onThemeEvent)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      mounted = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('wazyo:theme-updated', onThemeEvent)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  function pushModalHistory(modal, product) {
    const productId = String(product?.id ?? '')
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}
    const hashPrefix = modal === 'checkout' ? '#commande-' : '#produit-'
    const nextUrl = `${window.location.pathname}${window.location.search}${hashPrefix}${encodeURIComponent(productId)}`
    window.history.pushState({
      ...currentState,
      wazyoModal: modal,
      wazyoProductId: productId,
    }, '', nextUrl)
  }

  function openProductDetail(product) {
    if (!product) return
    pushModalHistory('product', product)
    setCheckoutProduct(null)
    setOpenProduct(product)
    fbq('track', 'ViewContent', {
      content_name: product.nom,
      content_ids: [product.id],
      content_type: 'product',
      value: Number(product.prix || 0),
      currency: 'DZD',
    })
  }

  function openDirectCheckout(product) {
    if (!product) return
    pushModalHistory('checkout', product)
    setOpenProduct(null)
    setCheckoutProduct(product)
  }

  function openCart() {
    if (cartOpen) return
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}
    window.history.pushState(
      { ...currentState, wazyoModal: 'cart' },
      '',
      `${window.location.pathname}${window.location.search}#panier`
    )
    setCartOpen(true)
  }

  function closeHistoryModal(modal) {
    const currentState = window.history.state || {}
    if (currentState.wazyoModal === modal) {
      window.history.back()
      return
    }

    if (modal === 'product') setOpenProduct(null)
    if (modal === 'checkout') setCheckoutProduct(null)
    if (modal === 'cart') setCartOpen(false)

    const hashPrefix = modal === 'checkout'
      ? '#commande-'
      : modal === 'cart'
        ? '#panier'
        : '#produit-'
    if (window.location.hash.startsWith(hashPrefix)) {
      const cleanState = { ...currentState }
      delete cleanState.wazyoModal
      delete cleanState.wazyoProductId
      window.history.replaceState(
        cleanState,
        '',
        `${window.location.pathname}${window.location.search}`
      )
    }
  }

  function closeProductDetail() {
    closeHistoryModal('product')
  }

  function closeDirectCheckout() {
    closeHistoryModal('checkout')
  }

  function closeCart() {
    closeHistoryModal('cart')
  }

  function toast(msg, type = 'default') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }

  function addToCart(product, qty = 1) {
    if (!product?.id) return

    const safeQty = Math.max(1, Math.floor(Number(qty) || 1))
    const modelName = String(product.model || product.modele || '').trim().toLowerCase()
    const colorName = String(product.color || product.couleur || '').trim().toLowerCase()
    const hasVariant = Boolean(modelName || colorName)
    const cartKey = hasVariant
      ? `${String(product.id)}::${encodeURIComponent(JSON.stringify({ model: modelName, color: colorName }))}`
      : String(product.id)

    setCart(prev => {
      const existing = prev.find(item => String(item.cartKey || item.id) === cartKey)
      if (existing) {
        return prev.map(item => String(item.cartKey || item.id) === cartKey
          ? { ...item, qty: Number(item.qty || 0) + safeQty }
          : item
        )
      }
      return [...prev, { ...product, cartKey, qty: safeQty }]
    })

    const variantLabel = product.model || product.modele || product.color || product.couleur
    toast(`✅ ${product.nom}${variantLabel ? ` — ${variantLabel}` : ''} ajouté au panier`)
    fbq('track', 'AddToCart', {
      content_name: product.nom,
      content_ids: [product.id],
      content_type: 'product',
      value: Number(product.prix || 0) * safeQty,
      currency: 'DZD',
    })
  }

  function removeFromCart(lineKey) {
    setCart(prev => prev.filter(item => String(item.cartKey || item.id) !== String(lineKey)))
  }

  function changeQty(lineKey, delta) {
    setCart(prev => prev.map(item => String(item.cartKey || item.id) === String(lineKey)
      ? { ...item, qty: Math.max(1, Number(item.qty || 1) + delta) }
      : item
    ))
  }

  const cartTotal = cart.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  async function submitOrder(form) {
    function getCookie(name) {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return m ? decodeURIComponent(m[1]) : null
    }

    const fbc = getCookie('_fbc')
    const fbp = getCookie('_fbp')

    try {
      const items = Array.isArray(form.items) ? form.items : []
      const hasColors = items.some(i => i?.color || i?.couleur)
      const hasModels = items.some(i => i?.model || i?.modele)
      if (hasColors && hasModels) {
        toast('Une commande ne peut pas mélanger couleurs et modèles. Réessaie depuis la fiche produit.', 'error')
        return false
      }
      const offerCode = String(affiliateOffer?.code || '').trim()
      const targetProductId = affiliateOffer?.product_id
      const includesTarget = !!offerCode && items.some(i => String(i?.id) === String(targetProductId))
      const allItemsAreTarget = !!offerCode && items.length > 0 &&
        items.every(i => String(i?.id) === String(targetProductId))

      // Le SQL actuel applique une seule réduction influenceur à un seul
      // produit. Refuser les paniers mélangés évite de créer une commande
      // sans la remise promise ou d'appliquer la remise à d'autres articles.
      if (includesTarget && !allItemsAreTarget) {
        toast('La remise influenceur s’applique uniquement à ce produit. Passe cette commande séparément depuis sa fiche.', 'error')
        return false
      }

      const useAffiliate = allItemsAreTarget
      const rpcName = hasModels
        ? 'create_order_with_models'
        : useAffiliate
          ? (hasColors ? 'create_order_with_colors_affiliate' : 'create_order_with_affiliate')
          : (hasColors ? 'create_order_with_colors' : 'create_order')

      const rpcArgs = {
        p_nom_client: form.nom,
        p_telephone: form.tel,
        p_wilaya: form.wilaya,
        p_commune: form.commune,
        p_adresse: form.adresse || '',
        p_note: form.note || '',
        p_items: items,
        p_mode_livraison: form.mode_livraison || 'domicile',
        // Conserver strictement le calcul de livraison côté SQL existant.
        p_frais_livraison: form.frais_livraison || 0,
        p_mode_paiement: form.mode_paiement || 'livraison',
        p_promo_code: useAffiliate ? null : (form.promo_code || null),
        p_fbc: fbc,
        p_fbp: fbp,
      }
      if (useAffiliate) rpcArgs.p_affiliate_code = offerCode

      const { data: order, error } = await supabase.rpc(rpcName, rpcArgs)

      if (error || !order) {
        console.error('Erreur RPC commande Wazyo:', {
          rpcName,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        toast('❌ Commande non enregistrée. Vérifie les informations et réessaie.', 'error')
        return false
      }

      // Stock is decremented atomically inside create_order().
      for (const alert of order.stock_alerts || []) {
        alertStockBas({ nom: alert.nom }, Number(alert.stock))
      }

      const contentIds = (order.items || []).map(i => i.id)

      // Browser Pixel: same event_id as CAPI Lead for deduplication.
      window.fbq && fbq('track', 'Lead', {
        value: order.total,
        currency: 'DZD',
        content_ids: contentIds,
        content_type: 'product',
      }, { eventID: order.id })

      // Server-side Meta event. Best effort: never block the customer flow.
      sendCapiEvent({
        eventName: 'Lead',
        eventId: order.id,
        phone: order.telephone,
        firstName: order.nom_client?.split(' ')[0],
        lastName: order.nom_client?.split(' ').slice(1).join(' '),
        city: order.wilaya,
        value: order.total,
        contentIds,
        eventSourceUrl: window.location.href,
        fbc,
        fbp,
      }).catch(e => console.error('CAPI Lead:', e))

      notifyTelegram(order)
      setLastOrder(order)
      setOrderItems(null)
      setCart([])
      setCartOpen(false)
      setPromoInfo(null)
      loadProducts()
      return true
    } catch (e) {
      console.error('Erreur soumission commande:', e)
      toast('❌ Une erreur est survenue. Vérifie tes informations et réessaie.', 'error')
      return false
    }
  }

  // ── Vraie authentification Supabase Auth (remplace le mdp en clair) ──
  useEffect(() => {
    if (!isAdmin) { setAuthLoading(false); return }
    let mounted = true

    const refreshAdminAuth = async (session) => {
      if (!session) {
        if (mounted) { setAdminAuth(false); setAuthLoading(false) }
        return
      }

      const { data: admin, error } = await supabase.rpc('is_admin')
      if (mounted) {
        setAdminAuth(!error && !!admin)
        setAuthLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => refreshAdminAuth(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshAdminAuth(session)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [isAdmin])

  async function handleLogin(email, pw) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) {
      toast('❌ Identifiants incorrects', 'error')
      return false
    }
    return true
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setAdminAuth(false)
    window.location.href = '/'
  }

  const categories = ['Tous', ...new Set(products.map(p => p.categorie).filter(Boolean))]
  const filtered = products.filter(p => {
    if (activeCat !== 'Tous' && p.categorie !== activeCat) return false
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Admin ────────────────────────────────────────────
  if (isAdmin) {
    if (authLoading) return <div style={{ minHeight:'100vh', background:'var(--bk)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--g4)' }}>Chargement…</div>
    if (!adminAuth) return <AdminLogin onLogin={handleLogin} />
    return <AdminPanel onLogout={handleLogout} onToast={toast} />
  }

  // ── Boutique ─────────────────────────────────────────
  if (!maintenanceChecked) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bk)', color:'var(--g4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
        Chargement…
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bk)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
        <div style={{ maxWidth:520, width:'100%', padding:'48px 28px', border:'1px solid rgba(201,168,76,.22)', borderRadius:20, background:'rgba(20,20,20,.9)', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔧</div>
          <h1 style={{ margin:'0 0 12px', fontSize:28 }}>Site en maintenance</h1>
          <p style={{ margin:0, color:'var(--g3)', lineHeight:1.7 }}>
            Notre boutique est momentanément indisponible. Nous revenons très bientôt. Merci pour votre patience.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app" data-storefront-theme-root="true">
      <style id="wazyo-storefront-theme-css">{STOREFRONT_THEME_CSS}</style>
      <AnnouncementBar />
      <Header
        cartCount={cartCount}
        onCartOpen={openCart}
        search={search}
        onSearch={setSearch}
      />

      <main>
        {/* ── Hero plein écran ── */}
        <Hero
          heroImage={heroSettings.url || ''}
          heroMediaType={heroSettings.type || 'image'}
          heroCustomMedia={Boolean(heroSettings.url)}
          heroProducts={products}
          onDiscoverProduct={openProductDetail}
          onScrollToCollection={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
        />

        <TrustMarquee />

        {/* Le champ de recherche est désormais dans l'en-tête. Cet ancrage garde le scroll vers le catalogue. */}
        <div id="collection" className="wz-collection-anchor" aria-hidden="true" />

        <ProductGrid
          products={filtered}
          categoryProducts={products}
          categories={categories}
          activeCat={activeCat}
          onCatChange={setActiveCat}
          loading={loading}
          onProductClick={openProductDetail}
          onAddToCart={addToCart}
          onBuyNow={openDirectCheckout}
        />
      </main>

      {/* ════════════════════════════════════════
          GALERIE PRODUITS DÉFILANTE
      ════════════════════════════════════════ */}
      {!openProduct && !checkoutProduct && !cartOpen && !orderItems && !lastOrder && !trackingOpen && (
        <ProductGallery products={products} onProductClick={openProductDetail} />
      )}

      <footer className="footer">
        <div className="fbn">Wazyo</div>
        <p className="ftag">{CONFIG.slogan}</p>

        {/* Infos contact */}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:10, flexWrap:'wrap' }}>
          <a href={`tel:+${CONFIG.telephone}`} style={{
            color:'var(--g3)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>📞 +{CONFIG.telephone}</a>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <a href={`mailto:${CONFIG.email}`} style={{
            color:'var(--g3)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>✉️ {CONFIG.email}</a>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer" style={{
            color:'rgba(37,211,102,.5)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>💬 WhatsApp</a>
        </div>

        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:12, flexWrap:'wrap' }}>
          <button
            onClick={() => setPolitiqueTab('confidentialite')}
            style={{
              background:'none', border:'none',
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            🔒 Politique de confidentialité
          </button>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <button
            onClick={() => setPolitiqueTab('retour')}
            style={{
              background:'none', border:'none',
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            🔄 Politique de retour
          </button>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <button
            onClick={() => setTrackingOpen(true)}
            style={{
              background:'none', border:'none',
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            📦 Suivre ma commande
          </button>
        </div>
        <p style={{ color:'var(--g3)', fontSize:11, marginTop:12 }}>
          © {new Date().getFullYear()} Wazyo · Tous droits réservés
        </p>
      </footer>

      {/* Direct checkout depuis la page d'accueil */}
      {checkoutProduct && (
        <ProductPage
          checkoutOnly
          product={checkoutProduct}
          affiliateOffer={affiliateOffer}
          allProducts={products}
          onClose={closeDirectCheckout}
          onSubmitOrder={async (form) => {
            const ok = await submitOrder(form)
            if (ok) closeDirectCheckout()
            return ok
          }}
          onPolitique={(tab) => setPolitiqueTab(tab)}
        />
      )}

      {/* Product detail */}
      <div className={`overlay ${openProduct ? 'on' : ''}`} onClick={closeProductDetail} />
      {openProduct && (
        <ProductPage
          product={openProduct}
          affiliateOffer={affiliateOffer}
          cartItems={cart}
          onClose={closeProductDetail}
          onAddToCart={(itemOrQty, qty) => {
            const item = itemOrQty && typeof itemOrQty === 'object' ? itemOrQty : openProduct
            const quantity = itemOrQty && typeof itemOrQty === 'object' ? qty : itemOrQty
            addToCart(item, quantity)
          }}
          allProducts={products}
          onBuyNow={(qty) => {
            setOrderItems([{ ...openProduct, qty }])
            setOpenProduct(null)
            window.history.pushState({}, '', window.location.pathname)
          }}
          onSubmitOrder={async (form) => {
            const ok = await submitOrder(form)
            if (ok) closeProductDetail()
            return ok
          }}
          onPolitique={(tab) => setPolitiqueTab(tab)}
        />
      )}

      {/* Cart */}
      <div className={`overlay ${cartOpen ? 'on' : ''}`} onClick={closeCart} />
      <Cart
        open={cartOpen}
        items={cart}
        total={cartTotal}
        onClose={closeCart}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onOrder={(promo, totalFinal) => { closeCart(); setPromoInfo(promo); setOrderItems(cart.map(({ cartKey, ...item }) => item))
            window.fbq && fbq('track', 'InitiateCheckout', {
              value: cart.reduce((s,i) => s + i.prix * i.qty, 0),
              currency: 'DZD',
              num_items: cart.reduce((s,i) => s + i.qty, 0),
            }) }}
      />

      {/* Order modal */}
      {orderItems && (
        <OrderModal
          items={orderItems}
          promo={promoInfo}
          onClose={() => { setOrderItems(null); setPromoInfo(null) }}
          onSubmit={submitOrder}
        />
      )}

      {/* Success */}
      {lastOrder && (
        <SuccessScreen
          order={lastOrder}
          onClose={() => setLastOrder(null)}
        />
      )}

      {/* Politiques */}
      {politiqueTab && (
        <PolitiquesPage
          defaultTab={politiqueTab}
          onClose={() => setPolitiqueTab(null)}
        />
      )}

      {/* Tracking */}
      {trackingOpen && <TrackingPage onClose={() => setTrackingOpen(false)} />}
      <WAButton />
      <CookieConsent />

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
