import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  
  const status = req.nextUrl.searchParams.get('status') || undefined
  return NextResponse.json(db.getOrders(status))
}

export async function POST(req: NextRequest) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  
  const { table_name, client_name, notes, items } = await req.json()
  
  if (!items || !items.length) {
    return NextResponse.json({ error: 'Commande vide' }, { status: 400 })
  }
  
  const order = db.createOrder({ table_name, client_name, notes: notes || '', items })
  
  // SSE events - order goes to caisse for validation first, NOT directly to cuisine
  broadcast(['caisse'], { type: 'NEW_ORDER_VALIDATION', payload: order, sound: 'new_order' })
  broadcast(['client'], { type: 'ORDER_PENDING_VALIDATION', payload: order })
  
  return NextResponse.json({ id: order.id, total: order.total }, { status: 201 })
}
