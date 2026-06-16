import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { saveSessionData, getLocalIP } from '@/lib/storage'

export async function POST() {
  const sessionId = uuidv4()
  const session = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    photoCount: 0,
    status: 'capturing' as const,
  }
  saveSessionData(sessionId, session)

  const ip = getLocalIP()
  return NextResponse.json({ sessionId, ip })
}
