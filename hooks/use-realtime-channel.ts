'use client'

/**
 * hooks/use-realtime-channel.ts
 *
 * Remplace le bloc EventSource dans les écrans caisse / cuisine / client.
 * Utilise Supabase Realtime (WebSocket) au lieu de SSE.
 *
 * Usage :
 *   useRealtimeChannel('caisse', auth?.token, (data) => {
 *     if (data.type === 'NEW_ORDER_VALIDATION') { ... }
 *   })
 *
 * Le callback `onMessage` reçoit exactement le même objet { type, payload, sound? }
 * qu'avec l'ancien EventSource.
 */

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

type RealtimeMessage = {
  type:    string
  payload: unknown
  sound?:  string
}

export function useRealtimeChannel(
  channel: string,
  token:   string | undefined,
  onMessage: (data: RealtimeMessage) => void
): void {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage  // toujours la dernière version

  useEffect(() => {
    if (!token) return

    const supabase: SupabaseClient = createBrowserClient()
    let sub: RealtimeChannel | null = null

    sub = supabase
      .channel(channel)
      .on(
        // @ts-expect-error — 'broadcast' est un type valide de Supabase Realtime
        'broadcast',
        { event: '*' },
        ({ payload }: { payload: RealtimeMessage }) => {
          try { onMessageRef.current(payload) } catch {}
        }
      )
      .subscribe()

    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [channel, token])  // eslint-disable-line react-hooks/exhaustive-deps
}
