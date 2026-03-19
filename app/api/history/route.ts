import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'chef', 'cuisinier', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  // Valider le paramètre date (format YYYY-MM-DD)
  const dateParam = req.nextUrl.searchParams.get('date')
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 200, 500)

  try {
    return NextResponse.json(await db.getHistory(date, limit))
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
