import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(1000),
    })
    const data = await res.json()
    const tunnel = data.tunnels?.find((t: { proto: string }) => t.proto === 'https')
    return NextResponse.json({ url: tunnel?.public_url ?? null })
  } catch {
    return NextResponse.json({ url: null })
  }
}
