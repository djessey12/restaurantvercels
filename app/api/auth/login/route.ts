import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  role:     z.string().min(1).max(20),
  password: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { role, password } = parsed.data
  const result = await login(role, password)
  if (!result) {
    // Délai court pour limiter le brute-force (sans bloquer trop longtemps)
    await new Promise(r => setTimeout(r, 300))
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
  }

  return NextResponse.json(result)
}
