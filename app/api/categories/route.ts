import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(await db.getCategories())
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
