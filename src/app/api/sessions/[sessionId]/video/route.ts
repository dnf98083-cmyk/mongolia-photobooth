import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getSessionData, saveSessionData, ensureSessionDir } from '@/lib/storage'


export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = getSessionData(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const dir = ensureSessionDir(sessionId)
  const filename = 'video.webm'
  const filepath = path.join(dir, filename)

  const buffer = Buffer.from(await req.arrayBuffer())
  fs.writeFileSync(filepath, buffer)

  session.videoFile = filename
  saveSessionData(sessionId, session)

  return NextResponse.json({ ok: true, filename })
}
