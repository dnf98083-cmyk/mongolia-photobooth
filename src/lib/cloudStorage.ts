import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET = 'photos'

export async function isOnline(): Promise<boolean> {
  return navigator.onLine
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

    if (error) {
      console.error('Supabase upload error:', error)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const imageUrl = data.publicUrl
    const downloadPageUrl = 'https://cdn.jsdelivr.net/gh/dnf98083-cmyk/mongolia-photobooth@main/public/download-page.html'
    return `${downloadPageUrl}?img=${encodeURIComponent(imageUrl)}`
  } catch {
    return null
  }
}
