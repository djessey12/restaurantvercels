import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'chef', 'cuisinier', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const date = req.nextUrl.searchParams.get('date') || undefined
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 200
  return NextResponse.json(db.getHistory(date, limit))
}
