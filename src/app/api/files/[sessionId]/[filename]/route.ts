import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getSessionDir } from '@/lib/storage'

const MIME: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webm': 'video/webm',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string; filename: string }> }
) {
  const { sessionId, filename } = await params

  // 경로 순회 공격 방지
  const safe = path.basename(filename)
  const filepath = path.join(getSessionDir(sessionId), safe)

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const ext = safe.split('.').pop()?.toLowerCase() ?? ''
  const mime = MIME[ext] ?? 'application/octet-stream'
  const buffer = fs.readFileSync(filepath)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
