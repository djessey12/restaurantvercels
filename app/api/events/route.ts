/**
 * app/api/events/route.ts
 *
 * Anciennement : SSE serveur gardant une connexion ouverte (incompatible Vercel).
 * Désormais    : Ce endpoint n'est PLUS utilisé pour le temps-réel.
 *
 * Le temps-réel passe par Supabase Realtime directement depuis le navigateur
 * via le hook `useRealtimeChannel`.
 *
 * Cette route est conservée pour la compatibilité ascendante et répond 410 Gone
 * afin d'indiquer aux anciens clients de mettre à jour leur code.
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(
    JSON.stringify({
      error: 'SSE endpoint remplacé. Utilisez Supabase Realtime via useRealtimeChannel.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
