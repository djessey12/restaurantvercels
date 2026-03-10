import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['cuisinier', 'chef', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { id, idx } = await params
  const { done } = await req.json()
  const item = db.toggleItemDone(id, Number(idx), done)
  if (!item) return NextResponse.json({ error: 'Non trouve' }, { status: 404 })

  broadcast(['cuisine'], { type: 'ITEM_TOGGLED', payload: { order_id: id, idx: Number(idx), item } })
  return NextResponse.json(item)
}
