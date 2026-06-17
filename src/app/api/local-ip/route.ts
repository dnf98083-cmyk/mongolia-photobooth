import { NextResponse } from 'next/server'
import { getLocalIP } from '@/lib/storage'

export async function GET() {
  // .env.local 에 NEXT_PUBLIC_SERVER_IP 설정시 우선 사용
  const ip = process.env.NEXT_PUBLIC_SERVER_IP || getLocalIP()
  return NextResponse.json({ ip })
}
