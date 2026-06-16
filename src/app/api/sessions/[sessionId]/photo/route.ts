import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getSessionData, saveSessionData, ensureSessionDir } from '@/lib/storage'

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = getSessionData(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { photoIndex, data } = await req.json()
  const base64 = data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')

  const dir = ensureSessionDir(sessionId)
  const filename = `photo_${photoIndex}.jpg`
  fs.writeFileSync(path.join(dir, filename), buffer)

  session.photoCount = Math.max(session.photoCount, photoIndex + 1)
  saveSessionData(sessionId, session)

  return NextResponse.json({ ok: true, filename })
}
