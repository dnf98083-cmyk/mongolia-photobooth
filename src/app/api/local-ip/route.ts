import { NextResponse } from 'next/server'
import { getLocalIP } from '@/lib/storage'

export async function GET() {
  const ip = getLocalIP()
  return NextResponse.json({ ip })
}
