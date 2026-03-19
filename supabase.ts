import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !anon) {
  throw new Error('Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes')
}

/**
 * Client navigateur — clé anon, soumis au RLS.
 * Utilisé uniquement pour Supabase Realtime côté client.
 */
let _browserClient: SupabaseClient | null = null
export function createBrowserClient(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(url, anon, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return _browserClient
}

/**
 * Client serveur — service role key, contourne le RLS.
 * Utilisé UNIQUEMENT dans les routes API (jamais exposé au navigateur).
 */
export function createServerClient(): SupabaseClient {
  if (!svc) throw new Error('Variable SUPABASE_SERVICE_ROLE_KEY manquante')
  return createClient(url, svc, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
