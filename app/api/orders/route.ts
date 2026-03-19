import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { z } from 'zod'

const createSchema = z.object({
  table_name:  z.string().max(50).optional().default(''),
  client_name: z.string().max(100).optional().default(''),
  notes:       z.string().max(500).optional().default(''),
  items: z.array(z.object({
    menu_id: z.number().int().positive(),
    qty:     z.number().int().min(1).max(99),
  })).min(1).max(50),
})

export async function GET(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || undefined
  try {
    return NextResponse.json(await db.getOrders(status))
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await db.createOrder(parsed.data)
    await broadcast(['caisse'], { type: 'NEW_ORDER_VALIDATION', payload: order, sound: 'new_order' })
    await broadcast(['client'], { type: 'ORDER_PENDING_VALIDATION', payload: { id: order.id } })
    return NextResponse.json({ id: order.id, total: order.total }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
