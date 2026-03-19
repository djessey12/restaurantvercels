import { NextRequest, NextResponse } from 'next/server'
import { authenticate, logout } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  logout(session.token)
  return NextResponse.json({ success: true })
}
