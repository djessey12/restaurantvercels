import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'

export async function GET() {
  // Menu is public - no auth needed to view
  return NextResponse.json(db.getMenu())
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const session = authenticate(authHeader)
  if (!session) {
    return NextResponse.json({ error: 'Non autorise. Veuillez vous reconnecter.' }, { status: 401 })
  }
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Seul le caissier ou admin peut modifier le menu' }, { status: 403 })
  }
  
  const { name, description, price, category_id, emoji } = await req.json()
  if (!name || !price) {
    return NextResponse.json({ error: 'Nom et prix requis' }, { status: 400 })
  }
  const item = db.addMenuItem({ name, description: description || '', price: Number(price), category_id: Number(category_id) || 1, emoji: emoji || '🍽️' })
  
  broadcast(['caisse', 'cuisine', 'client'], { type: 'MENU_UPDATED', payload: { action: 'added', item } })
  return NextResponse.json(item, { status: 201 })
}
