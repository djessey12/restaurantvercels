import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { id } = await params
  const { rating } = await req.json()

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Note invalide (1-5)' }, { status: 400 })
  }

  const order = db.rateOrder(id, rating)
  if (!order) return NextResponse.json({ error: 'Impossible de noter cette commande' }, { status: 400 })

  return NextResponse.json({ success: true, rating: order.rating })
}
