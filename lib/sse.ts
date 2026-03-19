/**
 * lib/sse.ts — Broadcast temps-réel via Supabase Realtime HTTP API
 *
 * Remplace l'ancien système SSE en mémoire (qui ne fonctionnait pas
 * sur Vercel à cause de l'isolation des fonctions serverless).
 *
 * Le serveur envoie des messages via l'API HTTP de Supabase Realtime.
 * Les clients s'abonnent via Supabase Realtime (WebSocket) côté navigateur.
 *
 * Interface identique à l'ancienne sse.ts : broadcast() / broadcastAll()
 */

const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

type RealtimeEvent = {
  type:     string
  payload:  unknown
  sound?:   string
}

/** Envoie un événement sur un ou plusieurs canaux Supabase Realtime */
export async function broadcast(
  channels: string[],
  event: RealtimeEvent
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[realtime] Variables Supabase manquantes — broadcast ignoré')
    return
  }

  const messages = channels.map(channel => ({
    topic:   `realtime:${channel}`,
    event:   event.type,
    payload: event,
  }))

  try {
    const res = await fetch(
      `${SUPABASE_URL}/realtime/v1/api/broadcast`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey':        SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ messages }),
      }
    )
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error(`[realtime] broadcast échoué (${res.status}): ${txt}`)
    }
  } catch (err) {
    // Ne pas crasher la route API si le broadcast échoue
    console.error('[realtime] Erreur broadcast:', err)
  }
}

/** Envoie un événement sur TOUS les canaux connus */
export async function broadcastAll(event: RealtimeEvent): Promise<void> {
  return broadcast(['caisse', 'cuisine', 'client'], event)
}

// Les fonctions addClient / removeClient de l'ancienne sse.ts
// ne sont plus nécessaires (elles servaient uniquement à /api/events).
