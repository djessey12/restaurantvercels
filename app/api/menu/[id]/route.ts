import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { id } = await params
  const item = db.deleteMenuItem(Number(id))
  if (!item) return NextResponse.json({ error: 'Non trouve' }, { status: 404 })
  
  broadcast(['caisse', 'cuisine', 'client'], { type: 'MENU_UPDATED', payload: { action: 'removed', id: Number(id) } })
  return NextResponse.json({ success: true })
}
