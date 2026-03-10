// SSE Event Manager

type SSEClient = {
  id: string
  channel: string
  controller: ReadableStreamDefaultController
}

const clients: SSEClient[] = []

export function addClient(channel: string, controller: ReadableStreamDefaultController): string {
  const id = Math.random().toString(36).slice(2)
  clients.push({ id, channel, controller })
  
  // Send connected event
  const data = `data: ${JSON.stringify({ type: 'CONNECTED', payload: { channel } })}\n\n`
  try { controller.enqueue(new TextEncoder().encode(data)) } catch {}
  
  return id
}

export function removeClient(id: string) {
  const idx = clients.findIndex(c => c.id === id)
  if (idx !== -1) clients.splice(idx, 1)
}

export function broadcast(channels: string[], event: { type: string; payload: unknown; sound?: string }) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  const encoded = new TextEncoder().encode(data)
  
  for (const client of clients) {
    if (channels.includes(client.channel)) {
      try {
        client.controller.enqueue(encoded)
      } catch {
        // Client disconnected, will be cleaned up
      }
    }
  }
}

export function broadcastAll(event: { type: string; payload: unknown }) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  const encoded = new TextEncoder().encode(data)
  
  for (const client of clients) {
    try {
      client.controller.enqueue(encoded)
    } catch {}
  }
}

// Keep-alive ping every 20 seconds
setInterval(() => {
  const ping = new TextEncoder().encode(`:ping\n\n`)
  for (let i = clients.length - 1; i >= 0; i--) {
    try {
      clients[i].controller.enqueue(ping)
    } catch {
      clients.splice(i, 1)
    }
  }
}, 20000)
