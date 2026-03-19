'use client'

/**
 * lib/store.ts — Store côté client (inchangé côté interface)
 *
 * Seule différence vs l'original : STORAGE_KEY mis à jour,
 * et les tokens JWT sont maintenant de vraies chaînes signées
 * (non plus des chaînes statiques en dur).
 */

export type AuthState = {
  token:  string
  role:   string
  access: string[]
}

const STORAGE_KEY = 'resto_auth_v2'   // v2 pour invalider les anciens tokens statiques

export function getAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try { return JSON.parse(stored) } catch { return null }
}

export function setAuth(auth: AuthState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  sessionStorage.removeItem(STORAGE_KEY)
  // Nettoyer aussi l'ancienne clé si elle existe
  sessionStorage.removeItem('resto_auth')
}

export function getTrackedOrder(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('resto_tracked_order')
}

export function setTrackedOrder(orderId: string) {
  sessionStorage.setItem('resto_tracked_order', orderId)
}

// ── API helper ────────────────────────────────────────────

export async function api(path: string, options: RequestInit = {}) {
  const auth    = getAuth()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  // Ne pas forcer Content-Type si FormData (le browser gère le boundary)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  } else if (!options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    if (res.status === 401) clearAuth()
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
    throw new Error(err.error ?? `Erreur ${res.status}`)
  }

  return res.json()
}

// ── Moteur sonore (inchangé) ──────────────────────────────

function playTones(frequencies: number[], duration = 0.15, gap = 0.05) {
  try {
    const ctx  = new AudioContext()
    let   time = ctx.currentTime
    for (const freq of frequencies) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, time)
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration)
      osc.start(time)
      osc.stop(time + duration)
      time += duration + gap
    }
  } catch {}
}

export const sounds = {
  newOrder:        () => playTones([880, 1108, 1318], 0.2, 0.05),
  orderSent:       () => playTones([1318, 1568], 0.15, 0.05),
  acknowledged:    () => playTones([1046, 1318], 0.2, 0.08),
  preparing:       () => playTones([880, 1108, 1318], 0.1, 0.03),
  orderReady:      () => playTones([1318, 1568, 1760, 2093], 0.2, 0.06),
  served:          () => playTones([1568, 1318, 1046], 0.2, 0.06),
  caisseNewOrder:  () => playTones([1318, 1568], 0.15, 0.05),
  validated:       () => playTones([1046, 1318, 1568], 0.15, 0.04),
}

// ── Formatage (inchangé) ──────────────────────────────────

export function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA'
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "À l'instant"
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  return `${hours}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
}
