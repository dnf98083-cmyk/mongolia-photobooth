import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET = 'photos'

export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(SUPABASE_URL, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

export async function uploadStripToCloud(
  sessionId: string,
  base64Data: string
): Promise<string | null> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const blob = new Blob([buffer], { type: 'image/png' })

    const path = `strips/${sessionId}.png`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/png', upsert: true })

    if (error) return null

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}
