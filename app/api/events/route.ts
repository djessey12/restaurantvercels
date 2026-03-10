import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { addClient, removeClient } from '@/lib/sse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const channel = req.nextUrl.searchParams.get('channel')

  if (!token || !channel) {
    return new Response('Missing token or channel', { status: 400 })
  }

  const session = getSession(token)
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Validate channel access
  const channelAccess: Record<string, string[]> = {
    caisse: ['caissier', 'admin'],
    cuisine: ['cuisinier', 'chef', 'admin'],
    client: ['client', 'caissier', 'cuisinier', 'chef', 'admin'],
  }

  if (!channelAccess[channel]?.includes(session.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  let clientId: string

  const stream = new ReadableStream({
    start(controller) {
      clientId = addClient(channel, controller)
    },
    cancel() {
      if (clientId) removeClient(clientId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
