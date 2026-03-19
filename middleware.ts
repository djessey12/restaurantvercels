import { NextRequest, NextResponse } from 'next/server'

/**
 * middleware.ts — Sécurité globale
 *
 * • Headers de sécurité HTTP sur toutes les réponses
 * • Rate-limiting basique sur les routes d'auth (par IP)
 * • Blocage des méthodes HTTP non utilisées
 * • Protection CSRF (origin check sur les mutations)
 */

// ── Rate Limiter en mémoire (adapté à Vercel Edge) ────────
// Vercel redémarre les fonctions, donc c'est suffisant pour
// ralentir le brute-force sans infrastructure externe.

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now    = Date.now()
  const bucket = rateBuckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count++
  if (bucket.count > maxRequests) return true

  return false
}

// ── Allowed methods par préfixe de route ─────────────────
const ROUTE_METHODS: Array<[RegExp, string[]]> = [
  [/^\/api\/auth\/login$/,           ['POST']],
  [/^\/api\/auth\/logout$/,          ['POST']],
  [/^\/api\/auth\/me$/,              ['GET']],
  [/^\/api\/categories$/,            ['GET']],
  [/^\/api\/menu$/,                  ['GET', 'POST']],
  [/^\/api\/menu\/\d+$/,             ['DELETE']],
  [/^\/api\/menu\/\d+\/media$/,      ['POST', 'DELETE']],
  [/^\/api\/orders$/,                ['GET', 'POST']],
  [/^\/api\/orders\/[^/]+$/,         ['GET']],
  [/^\/api\/orders\/[^/]+\/status$/, ['PATCH']],
  [/^\/api\/orders\/[^/]+\/items\/\d+$/, ['PATCH']],
  [/^\/api\/orders\/[^/]+\/rate$/,   ['POST']],
  [/^\/api\/orders\/[^/]+\/refresh$/,['GET']],
  [/^\/api\/history$/,               ['GET']],
  [/^\/api\/stats$/,                 ['GET']],
  [/^\/api\/transactions$/,          ['GET']],
  [/^\/api\/admin\/reset$/,          ['DELETE']],
  [/^\/api\/events$/,                ['GET']],
]

export function middleware(req: NextRequest) {
  const { pathname, origin: reqOrigin } = req.nextUrl
  const method  = req.method
  const ip      = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // ── 1. Rate-limit sur /api/auth/login ─────────────────
  if (pathname === '/api/auth/login' && method === 'POST') {
    if (isRateLimited(`login:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 1 minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // ── 2. Rate-limit général sur toutes les routes API ───
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(`api:${ip}`, 200, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de requêtes.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // ── 3. Vérification de méthode HTTP ───────────────────
  if (pathname.startsWith('/api/')) {
    const rule = ROUTE_METHODS.find(([pattern]) => pattern.test(pathname))
    if (rule && !rule[1].includes(method)) {
      return NextResponse.json(
        { error: `Méthode ${method} non autorisée` },
        {
          status: 405,
          headers: { Allow: rule[1].join(', ') },
        }
      )
    }
  }

  // ── 4. Protection CSRF pour les mutations ─────────────
  // On vérifie que l'origin ou le referer correspond à l'app
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && pathname.startsWith('/api/')) {
    const headerOrigin  = req.headers.get('origin')  ?? ''
    const headerReferer = req.headers.get('referer') ?? ''

    if (appOrigin) {
      const originOk  = headerOrigin  && (headerOrigin  === appOrigin || headerOrigin.startsWith(appOrigin))
      const refererOk = headerReferer && (headerReferer === appOrigin || headerReferer.startsWith(appOrigin))

      // En développement ou si la variable n'est pas configurée, on laisse passer
      if (!originOk && !refererOk && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Origin non autorisée' }, { status: 403 })
      }
    }
  }

  // ── 5. Headers de sécurité sur toutes les réponses ────
  const res = NextResponse.next()

  res.headers.set('X-Content-Type-Options',    'nosniff')
  res.headers.set('X-Frame-Options',           'DENY')
  res.headers.set('X-XSS-Protection',          '1; mode=block')
  res.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",    // Next.js nécessite unsafe-eval en dev
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} wss://*.supabase.co`,
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
