import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  rating: z.number().int().min(1).max(5),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Note invalide (1-5)' }, { status: 400 })
  }

  const { id } = await params
  const order = await db.rateOrder(id, parsed.data.rating)
  if (!order) {
    return NextResponse.json({ error: 'Impossible de noter cette commande' }, { status: 400 })
  }

  return NextResponse.json({ success: true, rating: order.rating })
}
