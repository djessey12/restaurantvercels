import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { z } from 'zod'

const addSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  price:       z.number().int().positive(),
  category_id: z.number().int().positive().optional().default(1),
  emoji:       z.string().max(10).optional().default('🍽️'),
})

export async function GET() {
  try {
    return NextResponse.json(await db.getMenu())
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) {
    return NextResponse.json({ error: 'Non autorise. Veuillez vous reconnecter.' }, { status: 401 })
  }
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Seul le caissier ou admin peut modifier le menu' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const item = await db.addMenuItem(parsed.data)
    await broadcast(['caisse', 'cuisine', 'client'], { type: 'MENU_UPDATED', payload: { action: 'added', item } })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[menu POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
