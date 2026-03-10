import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/sse'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Seul le caissier peut gerer les medias du menu' }, { status: 403 })
  }

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier envoye' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non supporte' }, { status: 400 })
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const filename = `menu-${id}-${Date.now()}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const filepath = join(dir, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(bytes))

  const mediaUrl = `/uploads/${filename}`
  const mediaType = file.type.startsWith('video/') ? 'video' : 'image'

  const item = db.updateMenuMedia(Number(id), mediaUrl, mediaType)
  if (!item) return NextResponse.json({ error: 'Article non trouve' }, { status: 404 })

  broadcast(['caisse', 'cuisine', 'client'], { type: 'MENU_UPDATED', payload: { action: 'media', id: Number(id), media_url: mediaUrl, media_type: mediaType } })

  return NextResponse.json({ success: true, media_url: mediaUrl, media_type: mediaType })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = authenticate(req.headers.get('Authorization'))
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  if (!hasRole(session, ['caissier', 'admin'])) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { id } = await params
  const item = db.updateMenuMedia(Number(id), '', '')
  if (!item) return NextResponse.json({ error: 'Article non trouve' }, { status: 404 })

  broadcast(['caisse', 'cuisine', 'client'], { type: 'MENU_UPDATED', payload: { action: 'media_removed', id: Number(id) } })

  return NextResponse.json({ success: true })
}
