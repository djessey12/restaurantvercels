// Authentication system - deterministic tokens that survive server restarts

type Role = 'client' | 'caissier' | 'cuisinier' | 'chef' | 'admin'

type Session = {
  token: string
  role: Role
  access: string[]
}

const passwords: Record<string, string> = {
  caissier: 'caisse2024',
  cuisinier: 'cuisine2024',
  chef: 'chef2024',
  admin: 'admin2024',
}

const accessMap: Record<Role, string[]> = {
  client: ['caisse_readonly', 'client_suivi'],
  caissier: ['caisse', 'suivi', 'historique'],
  cuisinier: ['cuisine', 'suivi'],
  chef: ['cuisine', 'suivi', 'historique'],
  admin: ['caisse', 'cuisine', 'suivi', 'historique', 'admin'],
}

// Use deterministic tokens so they survive server restarts (HMR)
// In production you'd use JWT or a database-backed session
const TOKEN_PREFIX: Record<string, string> = {
  client: 'tok_client_static_2024',
  caissier: 'tok_caissier_static_2024',
  cuisinier: 'tok_cuisinier_static_2024',
  chef: 'tok_chef_static_2024',
  admin: 'tok_admin_static_2024',
}

// Track active sessions with deterministic tokens
const activeSessions = new Map<string, Session>()

// Initialize all possible sessions so tokens always resolve
function ensureSession(role: Role): Session {
  const token = TOKEN_PREFIX[role]
  if (!activeSessions.has(token)) {
    activeSessions.set(token, {
      token,
      role,
      access: accessMap[role],
    })
  }
  return activeSessions.get(token)!
}

// Pre-initialize all sessions so they survive HMR
for (const role of Object.keys(TOKEN_PREFIX)) {
  ensureSession(role as Role)
}

export function login(role: string, password?: string): { token: string; role: string; access: string[] } | null {
  const r = role as Role
  if (!accessMap[r]) return null

  if (r !== 'client') {
    if (!password || passwords[r] !== password) return null
  }

  const session = ensureSession(r)
  return { token: session.token, role: r, access: session.access }
}

export function getSession(token: string): Session | null {
  // Check if it matches any known token pattern
  const session = activeSessions.get(token)
  if (session) return session

  // Fallback: try to match by prefix
  for (const [knownToken, sess] of activeSessions) {
    if (token === knownToken) return sess
  }
  return null
}

export function logout(token: string): boolean {
  // Don't actually delete the session - just acknowledge
  return activeSessions.has(token)
}

export function authenticate(authHeader: string | null): Session | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  return getSession(token)
}

export function hasRole(session: Session, roles: string[]): boolean {
  return roles.includes(session.role)
}
