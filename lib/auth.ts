/**
 * lib/auth.ts — Authentification JWT sécurisée
 *
 * • Tokens JWT signés (HS256), expiration 8h
 * • Mots de passe hashés bcrypt stockés en variables d'environnement
 * • Aucun secret en dur dans le code
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'

// ── Types ────────────────────────────────────────────────

type Role = 'client' | 'caissier' | 'cuisinier' | 'chef' | 'admin'

export type Session = {
  token:  string
  role:   Role
  access: string[]
}

// ── Accès par rôle ────────────────────────────────────────

const accessMap: Record<Role, string[]> = {
  client:    ['client_suivi'],
  caissier:  ['caisse', 'suivi', 'historique'],
  cuisinier: ['cuisine', 'suivi'],
  chef:      ['cuisine', 'suivi', 'historique'],
  admin:     ['caisse', 'cuisine', 'suivi', 'historique', 'admin'],
}

// ── Secret JWT ────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET manquant ou trop court (min 32 caractères)')
  }
  return new TextEncoder().encode(secret)
}

// ── Hashes de mots de passe ──────────────────────────────
// Stockés en variables d'environnement (voir scripts/hash-passwords.mjs)

function getPasswordHash(role: Role): string | null {
  const map: Partial<Record<Role, string | undefined>> = {
    caissier:  process.env.AUTH_HASH_CAISSIER,
    cuisinier: process.env.AUTH_HASH_CUISINIER,
    chef:      process.env.AUTH_HASH_CHEF,
    admin:     process.env.AUTH_HASH_ADMIN,
  }
  return map[role] ?? null
}

// ── Fonctions publiques ───────────────────────────────────

/** Connecte un utilisateur, retourne token+session ou null */
export async function login(
  role: string,
  password?: string
): Promise<{ token: string; role: string; access: string[] } | null> {
  const r = role as Role
  if (!accessMap[r]) return null

  // Le rôle client n'a pas de mot de passe
  if (r !== 'client') {
    if (!password) return null
    const hash = getPasswordHash(r)
    if (!hash) {
      console.error(`Hash manquant pour le rôle: ${r} (variable AUTH_HASH_${r.toUpperCase()})`)
      return null
    }
    const valid = await bcrypt.compare(password, hash)
    if (!valid) return null
  }

  const secret = getJwtSecret()
  const token = await new SignJWT({ role: r, access: accessMap[r] } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setSubject(r)
    .sign(secret)

  return { token, role: r, access: accessMap[r] }
}

/** Vérifie un token JWT, retourne la session ou null */
export async function getSession(token: string): Promise<Session | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    const role   = payload.role as Role
    const access = (payload.access as string[]) ?? accessMap[role] ?? []
    return { token, role, access }
  } catch {
    return null
  }
}

/** Authentifie depuis le header Authorization: Bearer <token> */
export async function authenticate(
  authHeader: string | null
): Promise<Session | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  return getSession(token)
}

/** Vérifie si la session a l'un des rôles requis */
export function hasRole(session: Session, roles: string[]): boolean {
  return roles.includes(session.role)
}

/** Logout (côté client : supprimer le token du sessionStorage suffit) */
export function logout(_token: string): boolean {
  // JWT est stateless — le client supprime simplement son token.
  // Pour une révocation immédiate, une liste noire Redis serait nécessaire.
  return true
}
