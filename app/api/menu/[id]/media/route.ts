import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const item = await db.deleteMenuItem(numId)
  if (!item) return NextResponse.json({ error: 'Non trouve' }, { status: 404 })

  await broadcast(['caisse', 'cuisine', 'client'], {
    type: 'MENU_UPDATED',
    payload: { action: 'removed', id: numId },
  })
  return NextResponse.json({ success: true })
}
