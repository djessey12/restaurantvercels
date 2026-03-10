import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { id } = await params
  const order = db.getOrder(id)
  if (!order) return NextResponse.json({ error: 'Non trouve' }, { status: 404 })
  
  const transactions = db.getTransactions(id)
  return NextResponse.json({ ...order, transactions })
}
