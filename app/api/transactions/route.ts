import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const orderId = req.nextUrl.searchParams.get('order_id') || undefined

  // Valider le format de l'order_id si fourni
  if (orderId && (orderId.length > 50 || !/^[A-Z0-9-]+$/.test(orderId))) {
    return NextResponse.json({ error: 'order_id invalide' }, { status: 400 })
  }

  try {
    return NextResponse.json(await db.getTransactions(orderId))
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
