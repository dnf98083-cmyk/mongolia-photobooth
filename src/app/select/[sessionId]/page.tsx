'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { uploadStripToCloud } from '@/lib/cloudStorage'

type ColorTheme = 'pink' | 'yellow' | 'green' | 'blue'

const THEMES: Record<ColorTheme, { primary: string; bg: string; label: string }> = {
  pink:   { primary: '#E91E8C', bg: '#FFF5FA', label: '핑크' },
  yellow: { primary: '#D4900A', bg: '#FFFDF0', label: '옐로우' },
  green:  { primary: '#2E7D32', bg: '#F0FFF2', label: '그린' },
  blue:   { primary: '#1565C0', bg: '#EEF4FF', label: '블루' },
}

const STRIP_W = 800
const STRIP_H = 1040
const REQUIRED = 4

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export default function SelectPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [photos, setPhotos] = useState<string[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [stripUrl, setStripUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [localIP, setLocalIP] = useState('')
  const [isCloudMode, setIsCloudMode] = useState(false)
  const [colorTheme, setColorTheme] = useState<ColorTheme>('pink')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    fetch('/api/local-ip').then(r => r.json()).then(d => setLocalIP(d.ip))
  }, [])

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(session => {
        const count: number = session.photoCount ?? 0
        setPhotos(Array.from({ length: count }, (_, i) => `/api/files/${sessionId}/photo_${i}.jpg`))
      })
  }, [sessionId])

  function toggleSelect(i: number) {
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i)
      if (prev.length >= REQUIRED) return prev
      return [...prev, i]
    })
  }

  const buildStrip = useCallback(async () => {
    const canvas = canvasRef.current!
    canvas.width = STRIP_W
    canvas.height = STRIP_H
    const ctx = canvas.getContext('2d')!
    const { primary: C, bg: BG } = THEMES[colorTheme]

    const SB_CX = 80    // sidebar center x (sidebar: x=6, w=148)
    const SEP_X = 158   // separator line x
    const CONT_X = 165  // right content start x

    // ── Background ────────────────────────────────────────────
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, STRIP_W, STRIP_H)

    // Sidebar tinted bg
    ctx.fillStyle = BG
    roundedRect(ctx, 6, 6, 148, STRIP_H - 12, 14)
    ctx.fill()

    // Outer border
    ctx.strokeStyle = C
    ctx.lineWidth = 4
    roundedRect(ctx, 4, 4, STRIP_W - 8, STRIP_H - 8, 18)
    ctx.stroke()

    // Separator line
    ctx.strokeStyle = C
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(SEP_X, 14)
    ctx.lineTo(SEP_X, STRIP_H - 14)
    ctx.stroke()

    // ── Sidebar: Cross in circle ─────────────────────────────
    const iconCY = 72
    ctx.strokeStyle = C
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(SB_CX, iconCY, 28, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(SB_CX, iconCY - 16); ctx.lineTo(SB_CX, iconCY + 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(SB_CX - 13, iconCY - 5); ctx.lineTo(SB_CX + 13, iconCY - 5); ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(SB_CX - 10, iconCY + 5); ctx.lineTo(SB_CX + 10, iconCY + 5)
    ctx.moveTo(SB_CX - 10, iconCY + 10); ctx.lineTo(SB_CX + 10, iconCY + 10)
    ctx.stroke()

    // ── Sidebar: MONGOLIA (rotated) ──────────────────────────
    ctx.save()
    ctx.translate(SB_CX, STRIP_H * 0.415)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = C
    ctx.font = 'bold 52px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('MONGOLIA', 0, 0)
    ctx.restore()

    // MISSION YOUTH CAMP (rotated, visually below MONGOLIA)
    ctx.save()
    ctx.translate(SB_CX, STRIP_H * 0.415 + 36)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = C
    ctx.font = 'bold 10px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('MISSION  YOUTH  CAMP', 0, 0)
    ctx.restore()

    // ── Sidebar: Stamp circle ────────────────────────────────
    const stX = SB_CX
    const stY = Math.round(STRIP_H * 0.625)
    const stR = 50
    ctx.strokeStyle = C
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(stX, stY, stR, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(stX, stY, stR - 9, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = C
    ctx.font = 'bold 9px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('MISSION', stX, stY - stR + 17)
    ctx.fillText('COMPLETE!', stX, stY + stR - 17)
    // Tent icon
    ctx.strokeStyle = C
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(stX, stY - 18); ctx.lineTo(stX - 18, stY + 8); ctx.lineTo(stX + 18, stY + 8)
    ctx.closePath(); ctx.stroke()
    roundedRect(ctx, stX - 6, stY - 2, 12, 10, 2); ctx.stroke()
    // Side stars
    ctx.fillStyle = C
    ctx.font = '10px sans-serif'
    ctx.fillText('★', stX - 34, stY + 1)
    ctx.fillText('★', stX + 34, stY + 1)

    // ── Sidebar: Info block ──────────────────────────────────
    const infoTop = STRIP_H * 0.762
    ctx.fillStyle = C
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 19px Arial, sans-serif'
    ctx.fillText('2026', SB_CX, infoTop)
    ctx.font = '13px sans-serif'
    ctx.fillText('- -', SB_CX, infoTop + 22)
    ctx.font = '15px sans-serif'
    ctx.fillText('✈', SB_CX, infoTop + 42)
    ctx.font = 'bold 9.5px Arial, sans-serif'
    ctx.fillText('SEOUL', SB_CX, infoTop + 60)
    ctx.font = '11px sans-serif'
    ctx.fillText('▼', SB_CX, infoTop + 76)
    ctx.font = 'bold 9.5px Arial, sans-serif'
    ctx.fillText('MONGOLIA', SB_CX, infoTop + 93)

    // ── Sidebar: Camera icon ─────────────────────────────────
    const camY = STRIP_H - 66
    ctx.strokeStyle = C
    ctx.lineWidth = 2
    roundedRect(ctx, SB_CX - 20, camY - 11, 40, 26, 5); ctx.stroke()
    ctx.beginPath(); ctx.arc(SB_CX, camY + 2, 8, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = C
    ctx.fillRect(SB_CX - 6, camY - 15, 12, 5)

    // ── Header: Bible verse ──────────────────────────────────
    const HDRCX = (SEP_X + STRIP_W) / 2
    ctx.fillStyle = C
    ctx.font = 'italic 11px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('For God so loved the world that He gave', HDRCX, 16)
    ctx.fillText('His one and only Son, that whoever believes in', HDRCX, 29)
    ctx.fillText('Him shall not perish but have eternal life.    John 3:16', HDRCX, 42)
    ctx.font = '14px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('✦', CONT_X + 6, 36)
    ctx.fillText('✦', STRIP_W - 14, 36)
    // Separator
    ctx.strokeStyle = C
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CONT_X, 70); ctx.lineTo(STRIP_W - 8, 70); ctx.stroke()

    // ── 2x2 Photo grid ───────────────────────────────────────
    const PX0 = CONT_X + 6
    const PY0 = 78
    const PGAP = 10
    const PW = (STRIP_W - PX0 - 8 - PGAP) / 2
    const PH = (STRIP_H - 44 - PY0 - PGAP) / 2

    const NUM_LABELS = ['01', '02', '03', '04']
    const NUM_ICONS  = ['◎', '☆', '♡', '✎']

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col
        const photoIdx = selected[idx]
        const px = PX0 + col * (PW + PGAP)
        const py = PY0 + row * (PH + PGAP)

        ctx.fillStyle = '#E0E0E0'
        roundedRect(ctx, px, py, PW, PH, 10); ctx.fill()

        if (photos[photoIdx]) {
          await new Promise<void>(resolve => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              ctx.save()
              roundedRect(ctx, px, py, PW, PH, 10); ctx.clip()
              const scale = Math.max(PW / img.width, PH / img.height)
              const sw = PW / scale
              const sh = PH / scale
              const sx = (img.width - sw) / 2
              const sy = (img.height - sh) / 2
              ctx.drawImage(img, sx, sy, sw, sh, px, py, PW, PH)
              ctx.restore()
              resolve()
            }
            img.onerror = () => resolve()
            img.src = photos[photoIdx]
          })
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 2
        roundedRect(ctx, px, py, PW, PH, 10); ctx.stroke()

        ctx.fillStyle = C
        ctx.font = 'bold 13px Arial, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`${NUM_LABELS[idx]} ${NUM_ICONS[idx]}`, px + 8, py + 8)
      }
    }

    // ── Footer ────────────────────────────────────────────────
    ctx.fillStyle = C
    ctx.font = '12.5px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, STRIP_H - 22)

    return canvas.toDataURL('image/png')
  }, [selected, photos, colorTheme])

  // 실시간 미리보기
  useEffect(() => {
    if (photos.length === 0) return
    let cancelled = false
    setPreviewing(true)
    buildStrip().then(url => {
      if (!cancelled) { setPreviewUrl(url); setPreviewing(false) }
    })
    return () => { cancelled = true }
  }, [selected, colorTheme, buildStrip, photos.length])

  async function confirmSelection() {
    if (selected.length !== REQUIRED) return
    setSaving(true)

    const dataUrl = await buildStrip()
    setStripUrl(dataUrl)

    await fetch(`/api/sessions/${sessionId}/strip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataUrl }),
    })

    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 10000))
    const cloudUrl = await Promise.race([uploadStripToCloud(sessionId, dataUrl), timeout])
    const ip = localIP || '192.168.137.1'

    if (cloudUrl) {
      setIsCloudMode(true)
      setQrUrl(cloudUrl)
    } else {
      setIsCloudMode(false)
      setQrUrl(`https://${ip}:3000/download/${sessionId}`)
    }
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 p-4">
      <canvas ref={canvasRef} className="hidden" />

      {!qrUrl ? (
        <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto">

          {/* 왼쪽: 선택 영역 */}
          <div className="flex-1">
            <h1 className="text-white text-xl font-black text-center mb-1 mt-1">사진 4장 고르기</h1>
            <p className="text-pink-200 text-center text-xs mb-2">{selected.length} / {REQUIRED} 선택됨</p>

            {/* 컬러 테마 선택 */}
            <div className="flex justify-center gap-2 mb-3">
              {(Object.entries(THEMES) as [ColorTheme, typeof THEMES.pink][]).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setColorTheme(key)}
                  title={t.label}
                  className={`w-8 h-8 rounded-full border-4 transition-all ${colorTheme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'}`}
                  style={{ backgroundColor: t.primary }}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((url, i) => {
                const selIdx = selected.indexOf(i)
                const isSelected = selIdx !== -1
                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all ${isSelected ? 'border-yellow-400 scale-95' : 'border-transparent opacity-70'}`}
                  >
                    <img src={url} alt={`photo-${i}`} className="w-full aspect-video object-cover" style={{ transform: 'scaleX(-1)' }} />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-yellow-400 text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">
                        {selIdx + 1}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center mt-3">
              <button
                onClick={confirmSelection}
                disabled={selected.length !== REQUIRED || saving}
                className="bg-white text-purple-900 font-extrabold text-lg px-8 py-3 rounded-full shadow-xl disabled:opacity-40 hover:scale-105 transition-transform"
              >
                {saving ? '스트립 만드는 중...' : `선택 완료 (${selected.length}/${REQUIRED})`}
              </button>
            </div>
          </div>

          {/* 오른쪽: 실시간 미리보기 */}
          <div className="flex flex-col items-center gap-2 md:pt-8">
            <p className="text-white text-sm font-bold tracking-wide">미리보기</p>
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="미리보기"
                  className="rounded-2xl shadow-2xl border-2 border-white/20"
                  style={{ width: 180, height: 'auto', opacity: previewing ? 0.5 : 1, transition: 'opacity 0.2s' }}
                />
              ) : (
                <div className="rounded-2xl bg-white/10 flex items-center justify-center" style={{ width: 180, height: 234 }}>
                  <p className="text-pink-200 text-xs">사진을 선택하세요</p>
                </div>
              )}
              {previewing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-4 w-full px-4">
          <div className="text-center">
            <p className="text-pink-200 text-xs tracking-widest mb-1">자양교회 몽골 선교</p>
            <h1 className="text-white text-3xl font-black">완성!</h1>
          </div>

          <div className={`px-5 py-2 rounded-full text-sm font-bold shadow-lg ${isCloudMode ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`}>
            {isCloudMode ? '🌐 온라인 — 어디서든 스캔 가능' : '📡 오프라인 — 핫스팟 연결 후 스캔'}
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center md:items-start w-full max-w-3xl">
            <div className="flex flex-col items-center gap-3">
              <img
                src={stripUrl}
                alt="strip"
                className="rounded-2xl shadow-2xl border-4 border-white/20"
                style={{ width: 200, height: 'auto' }}
              />
              <a
                href={stripUrl}
                download="인생네컷.png"
                className="bg-white text-purple-900 font-extrabold text-base px-6 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform w-full text-center"
              >
                📥 내 기기에 저장
              </a>
            </div>

            <div className="bg-white rounded-3xl p-5 flex flex-col items-center gap-3 shadow-2xl">
              <p className="text-gray-700 text-sm font-bold">📱 폰으로 QR 스캔</p>
              <QRCodeDisplay url={qrUrl} size={220} />
              <p className="text-gray-500 text-xs text-center leading-relaxed">
                {isCloudMode ? '인터넷만 있으면 어디서든 스캔 가능' : '노트북 핫스팟 연결 후 스캔'}
                <br />스캔하면 사진 저장 가능
              </p>
            </div>
          </div>

          <a href="/" className="bg-white/20 text-white font-bold px-8 py-3 rounded-full hover:bg-white/30 transition-colors text-sm mt-2">
            처음으로 돌아가기
          </a>
        </div>
      )}
    </main>
  )
}
