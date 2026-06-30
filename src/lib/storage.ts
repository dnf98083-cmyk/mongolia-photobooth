import fs from 'fs'
import path from 'path'
import os from 'os'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'sessions')

export function getSessionDir(sessionId: string) {
  return path.join(UPLOADS_DIR, sessionId)
}

export function ensureSessionDir(sessionId: string) {
  const dir = getSessionDir(sessionId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export interface SessionData {
  id: string
  createdAt: string
  photoCount: number
  stripFile?: string
  status: 'capturing' | 'selecting' | 'complete'
}

export function saveSessionData(sessionId: string, data: SessionData) {
  const dir = ensureSessionDir(sessionId)
  fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(data, null, 2))
}

export function getSessionData(sessionId: string): SessionData | null {
  try {
    const file = path.join(getSessionDir(sessionId), 'session.json')
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

export function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address
      }
    }
  }
  return 'localhost'
}
