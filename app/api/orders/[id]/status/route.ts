import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { z } from 'zod'

const schema = z.object({
  status:  z.enum(['pending', 'acknowledged', 'preparing', 'ready', 'served', 'cancelled']),
  message: z.string().max(200).optional(),
})

const KITCHEN_STATUSES = ['acknowledged', 'preparing', 'ready', 'served']
const CAISSE_STATUSES  = ['pending']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const { status, message } = parsed.data
  const { id } = await params

  if (CAISSE_STATUSES.includes(status) && !hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Seul le caissier peut valider les commandes' }, { status: 403 })
  }
  if (KITCHEN_STATUSES.includes(status) && !hasRole(session, ['cuisinier', 'chef', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const order = await db.updateOrderStatus(id, status as Parameters<typeof db.updateOrderStatus>[1], session.role)
  if (!order) return NextResponse.json({ error: 'Transition invalide ou commande introuvable' }, { status: 400 })

  // Événements temps-réel selon le statut
  switch (status) {
    case 'pending':
      await broadcast(['cuisine'], { type: 'NEW_ORDER',          payload: order,                                                                sound: 'new_order'   })
      await broadcast(['client'],  { type: 'ORDER_VALIDATED',    payload: { ...order, message: message || 'Votre commande a ete validee !' },   sound: 'acknowledged' })
      break
    case 'acknowledged':
      await broadcast(['client'],  { type: 'ORDER_ACKNOWLEDGED', payload: order, sound: 'acknowledged' })
      await broadcast(['caisse'],  { type: 'ORDER_STATUS_CHANGED', payload: order })
      break
    case 'preparing':
      await broadcast(['client'],  { type: 'ORDER_PREPARING',    payload: order, sound: 'preparing' })
      await broadcast(['caisse'],  { type: 'ORDER_STATUS_CHANGED', payload: order })
      break
    case 'ready':
      await broadcast(['client', 'caisse'], { type: 'ORDER_READY',      payload: order, sound: 'order_ready' })
      break
    case 'served':
      await broadcast(['client', 'caisse', 'cuisine'], { type: 'ORDER_SERVED', payload: order, sound: 'served' })
      break
    case 'cancelled':
      await broadcast(['caisse', 'cuisine', 'client'], {
        type: 'ORDER_CANCELLED',
        payload: { ...order, message: message || 'Commande annulee' },
      })
      break
  }

  return NextResponse.json(order)
}
