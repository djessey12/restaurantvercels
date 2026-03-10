import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

const KITCHEN_STATUSES = ['acknowledged', 'preparing', 'ready', 'served']
const CAISSE_STATUSES = ['pending']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { id } = await params
  const { status, message } = await req.json()

  // Caisse validation: only caissier/admin can validate pending_validation -> pending
  if (CAISSE_STATUSES.includes(status) && !hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Seul le caissier peut valider les commandes' }, { status: 403 })
  }

  // Kitchen-only statuses
  if (KITCHEN_STATUSES.includes(status) && !hasRole(session, ['cuisinier', 'chef', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const order = db.updateOrderStatus(id, status, session.role)
  if (!order) return NextResponse.json({ error: 'Transition invalide' }, { status: 400 })

  // Emit SSE events based on status
  switch (status) {
    case 'pending':
      // Caisse validated -> notify cuisine + client
      broadcast(['cuisine'], { type: 'NEW_ORDER', payload: order, sound: 'new_order' })
      broadcast(['client'], { type: 'ORDER_VALIDATED', payload: { ...order, message: message || 'Votre commande a ete validee par la caisse !' }, sound: 'acknowledged' })
      break
    case 'acknowledged':
      broadcast(['client'], { type: 'ORDER_ACKNOWLEDGED', payload: order, sound: 'acknowledged' })
      broadcast(['caisse'], { type: 'ORDER_STATUS_CHANGED', payload: order })
      break
    case 'preparing':
      broadcast(['client'], { type: 'ORDER_PREPARING', payload: order, sound: 'preparing' })
      broadcast(['caisse'], { type: 'ORDER_STATUS_CHANGED', payload: order })
      break
    case 'ready':
      broadcast(['client', 'caisse'], { type: 'ORDER_READY', payload: order, sound: 'order_ready' })
      break
    case 'served':
      broadcast(['client', 'caisse', 'cuisine'], { type: 'ORDER_SERVED', payload: order, sound: 'served' })
      break
    case 'cancelled':
      broadcast(['caisse', 'cuisine', 'client'], { type: 'ORDER_CANCELLED', payload: { ...order, message: message || 'Commande annulee' } })
      break
  }

  return NextResponse.json(order)
}
