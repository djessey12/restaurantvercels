import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { role, password } = await req.json()
  const result = login(role, password)
  if (!result) {
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
  }
  return NextResponse.json(result)
}
