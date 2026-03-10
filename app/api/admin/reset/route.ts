import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcastAll } from '@/lib/sse'

export async function DELETE(req: NextRequest) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  db.reset()
  broadcastAll({ type: 'RESET', payload: {} })
  return NextResponse.json({ success: true })
}
