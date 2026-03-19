import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { z } from 'zod'

const schema = z.object({
  done: z.boolean(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['cuisinier', 'chef', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { id, idx } = await params
  const numIdx = Number(idx)
  if (!Number.isInteger(numIdx) || numIdx < 0) {
    return NextResponse.json({ error: 'Index invalide' }, { status: 400 })
  }

  const item = await db.toggleItemDone(id, numIdx, parsed.data.done)
  if (!item) return NextResponse.json({ error: 'Non trouve' }, { status: 404 })

  await broadcast(['cuisine'], {
    type: 'ITEM_TOGGLED',
    payload: { order_id: id, idx: numIdx, item },
  })
  return NextResponse.json(item)
}
