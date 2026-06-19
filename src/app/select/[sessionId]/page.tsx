'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { uploadStripToCloud } from '@/lib/cloudStorage'

type ColorTheme = 'pink' | 'yellow' | 'green' | 'blue'
type LayoutType = '2x2' | '1x4' | '4x1'

const THEMES: Record<ColorTheme, { primary: string; bg: string; label: string }> = {
  pink:   { primary: '#E91E8C', bg: '#FFF5FA', label: '핑크' },
  yellow: { primary: '#D4900A', bg: '#FFFDF0', label: '옐로우' },
  green:  { primary: '#2E7D32', bg: '#F0FFF2', label: '그린' },
  blue:   { primary: '#1565C0', bg: '#EEF4FF', label: '블루' },
}

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

async function drawPhoto(
  ctx: CanvasRenderingContext2D,
  src: string, px: number, py: number, pw: number, ph: number
) {
  await new Promise<void>(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.save()
      roundedRect(ctx, px, py, pw, ph, 10); ctx.clip()
      const scale = Math.max(pw / img.width, ph / img.height)
      const sw = pw / scale, sh = ph / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, ph)
      ctx.restore()
      resolve()
    }
    img.onerror = () => resolve()
    img.src = src
  })
}

function drawSidebar(
  ctx: CanvasRenderingContext2D, C: string, BG: string,
  sbW: number, totalH: number
) {
  const cx = 6 + sbW / 2

  // Tinted sidebar bg
  ctx.fillStyle = BG
  roundedRect(ctx, 6, 6, sbW, totalH - 12, 14); ctx.fill()

  // Separator
  ctx.strokeStyle = C; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(6 + sbW + 4, 14); ctx.lineTo(6 + sbW + 4, totalH - 14); ctx.stroke()

  const sc = sbW / 148  // scale factor relative to 2x2 sidebar

  // Cross icon in circle
  const iconR = Math.round(28 * sc)
  const iconY = Math.round(55 * sc + iconR)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1.5, 2 * sc)
  ctx.beginPath(); ctx.arc(cx, iconY, iconR, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = Math.max(2, 3 * sc)
  ctx.beginPath(); ctx.moveTo(cx, iconY - iconR * 0.55); ctx.lineTo(cx, iconY + iconR * 0.48); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - iconR * 0.46, iconY - iconR * 0.15); ctx.lineTo(cx + iconR * 0.46, iconY - iconR * 0.15); ctx.stroke()

  // MONGOLIA (rotated)
  ctx.save()
  ctx.translate(cx, totalH * 0.415)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(52 * sc)}px Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MONGOLIA', 0, 0)
  ctx.restore()

  // MISSION YOUTH CAMP (rotated)
  ctx.save()
  ctx.translate(cx, totalH * 0.415 + Math.round(36 * sc))
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(10 * sc)}px Arial, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MISSION  YOUTH  CAMP', 0, 0)
  ctx.restore()

  // Stamp circle
  const stY = Math.round(totalH * 0.625)
  const stR = Math.round(50 * sc)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  ctx.beginPath(); ctx.arc(cx, stY, stR, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, stY, stR - Math.round(9 * sc), 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MISSION', cx, stY - stR + Math.round(17 * sc))
  ctx.fillText('COMPLETE!', cx, stY + stR - Math.round(17 * sc))
  // Tent
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  ctx.beginPath()
  ctx.moveTo(cx, stY - Math.round(18 * sc))
  ctx.lineTo(cx - Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.lineTo(cx + Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.closePath(); ctx.stroke()
  // Stars
  ctx.fillStyle = C
  ctx.font = `${Math.round(10 * sc)}px sans-serif`
  ctx.fillText('★', cx - Math.round(34 * sc), stY + 1)
  ctx.fillText('★', cx + Math.round(34 * sc), stY + 1)

  // Info: 2026 / plane / SEOUL → MONGOLIA
  const infoTop = totalH * 0.762
  ctx.fillStyle = C; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(19 * sc)}px Arial, sans-serif`
  ctx.fillText('2026', cx, infoTop)
  const li = Math.round(20 * sc)
  ctx.font = `${Math.round(9 * sc)}px sans-serif`; ctx.fillText('- -', cx, infoTop + li * 1.1)
  ctx.font = `${Math.round(14 * sc)}px sans-serif`; ctx.fillText('✈', cx, infoTop + li * 2.1)
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`
  ctx.fillText('SEOUL', cx, infoTop + li * 3)
  ctx.font = `${Math.round(10 * sc)}px sans-serif`; ctx.fillText('▼', cx, infoTop + li * 3.85)
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`; ctx.fillText('MONGOLIA', cx, infoTop + li * 4.65)

  // Camera
  const camY = totalH - Math.round(66 * sc)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  roundedRect(ctx, cx - Math.round(20 * sc), camY - Math.round(11 * sc), Math.round(40 * sc), Math.round(26 * sc), 5); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, camY + Math.round(2 * sc), Math.round(8 * sc), 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = C
  ctx.fillRect(cx - Math.round(6 * sc), camY - Math.round(15 * sc), Math.round(12 * sc), Math.round(5 * sc))
}

function drawHeader(
  ctx: CanvasRenderingContext2D, C: string,
  cx: number, startY: number, lineH: number
) {
  ctx.fillStyle = C
  ctx.font = 'italic 11px Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('For God so loved the world that He gave', cx, startY)
  ctx.fillText('His one and only Son, that whoever believes in', cx, startY + lineH)
  ctx.fillText('Him shall not perish but have eternal life.    John 3:16', cx, startY + lineH * 2)
  ctx.font = '14px sans-serif'; ctx.textBaseline = 'middle'
  ctx.fillText('✦', cx - 155, startY + lineH)
  ctx.fillText('✦', cx + 155, startY + lineH)
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
  const [layoutType, setLayoutType] = useState<LayoutType>('2x2')
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
    const ctx = canvas.getContext('2d')!
    const { primary: C, bg: BG } = THEMES[colorTheme]
    const NUM_LABELS = ['01', '02', '03', '04']
    const NUM_ICONS  = ['◎', '☆', '♡', '✎']

    // ── 2×2 layout ────────────────────────────────────────────
    if (layoutType === '2x2') {
      const W = 800, H = 1040
      canvas.width = W; canvas.height = H
      const SB_W = 148, CONT_X = 165, SEP_X = 158
      ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, W, H)
      drawSidebar(ctx, C, BG, SB_W, H)
      ctx.strokeStyle = C; ctx.lineWidth = 4
      roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 13)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 70); ctx.lineTo(W - 8, 70); ctx.stroke()
      const PX0 = CONT_X + 6, PY0 = 78, PGAP = 10
      const PW = (W - PX0 - 8 - PGAP) / 2
      const PH = (H - 44 - PY0 - PGAP) / 2
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const idx = row * 2 + col
          const px = PX0 + col * (PW + PGAP), py = PY0 + row * (PH + PGAP)
          ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, px, py, PW, PH, 10); ctx.fill()
          if (photos[selected[idx]]) await drawPhoto(ctx, photos[selected[idx]], px, py, PW, PH)
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
          roundedRect(ctx, px, py, PW, PH, 10); ctx.stroke()
          ctx.fillStyle = C; ctx.font = 'bold 13px Arial, sans-serif'
          ctx.textAlign = 'left'; ctx.textBaseline = 'top'
          ctx.fillText(`${NUM_LABELS[idx]} ${NUM_ICONS[idx]}`, px + 8, py + 8)
        }
      }
      ctx.fillStyle = C; ctx.font = '12.5px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, H - 22)

    // ── 1×4 layout ────────────────────────────────────────────
    } else if (layoutType === '1x4') {
      const W = 520, H = 980
      canvas.width = W; canvas.height = H
      const SB_W = 105, CONT_X = 118, SEP_X = 113
      ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, W, H)
      drawSidebar(ctx, C, BG, SB_W, H)
      ctx.strokeStyle = C; ctx.lineWidth = 4
      roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 13)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 70); ctx.lineTo(W - 8, 70); ctx.stroke()
      const PX = CONT_X + 4, PY0 = 78, PGAP = 8
      const PW = W - PX - 6
      const PH = (H - 44 - PY0 - PGAP * 3) / 4
      for (let i = 0; i < 4; i++) {
        const py = PY0 + i * (PH + PGAP)
        ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, PX, py, PW, PH, 8); ctx.fill()
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], PX, py, PW, PH)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
        roundedRect(ctx, PX, py, PW, PH, 8); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 12px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText(`${NUM_LABELS[i]} ${NUM_ICONS[i]}`, PX + 7, py + 7)
      }
      ctx.fillStyle = C; ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, H - 22)

    // ── 4×1 layout ────────────────────────────────────────────
    } else {
      const W = 1100, H = 420
      canvas.width = W; canvas.height = H
      const SB_W = 80, CONT_X = 93, SEP_X = 87
      ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, W, H)
      drawSidebar(ctx, C, BG, SB_W, H)
      ctx.strokeStyle = C; ctx.lineWidth = 4
      roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 12)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 62); ctx.lineTo(W - 8, 62); ctx.stroke()
      const PX0 = CONT_X + 5, PY = 70, PGAP = 8
      const PW = (W - PX0 - 8 - PGAP * 3) / 4
      const PH = H - PY - 46
      for (let i = 0; i < 4; i++) {
        const px = PX0 + i * (PW + PGAP)
        ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, px, PY, PW, PH, 8); ctx.fill()
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], px, PY, PW, PH)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
        roundedRect(ctx, px, PY, PW, PH, 8); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 12px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText(`${NUM_LABELS[i]} ${NUM_ICONS[i]}`, px + 7, PY + 7)
      }
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, H - 38); ctx.lineTo(W - 8, H - 38); ctx.stroke()
      ctx.fillStyle = C; ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, H - 20)
    }

    return canvas.toDataURL('image/png')
  }, [selected, photos, colorTheme, layoutType])

  // 실시간 미리보기
  useEffect(() => {
    if (photos.length === 0) return
    let cancelled = false
    setPreviewing(true)
    buildStrip().then(url => {
      if (!cancelled) { setPreviewUrl(url); setPreviewing(false) }
    })
    return () => { cancelled = true }
  }, [selected, colorTheme, layoutType, buildStrip, photos.length])

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
      setIsCloudMode(true); setQrUrl(cloudUrl)
    } else {
      setIsCloudMode(false); setQrUrl(`https://${ip}:3000/download/${sessionId}`)
    }
    setSaving(false)
  }

  // Preview aspect ratio for placeholder
  const previewAspect = layoutType === '4x1' ? 1100 / 420 : layoutType === '1x4' ? 520 / 980 : 800 / 1040
  const previewW = layoutType === '4x1' ? 320 : 180
  const previewH = Math.round(previewW / previewAspect)

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 p-3">
      <canvas ref={canvasRef} className="hidden" />

      {!qrUrl ? (
        <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto">

          {/* 왼쪽: 선택 영역 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-black text-center mb-1 mt-1">사진 4장 고르기</h1>
            <p className="text-pink-200 text-center text-xs mb-2">{selected.length} / {REQUIRED} 선택됨</p>

            {/* 레이아웃 선택 */}
            <div className="flex justify-center gap-2 mb-2">
              {([['2x2','⊞','2×2'], ['1x4','▤','1×4'], ['4x1','⊟','4×1']] as [LayoutType,string,string][]).map(([key, icon, label]) => (
                <button
                  key={key}
                  onClick={() => setLayoutType(key)}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${layoutType === key ? 'bg-white text-purple-900 border-white' : 'bg-white/10 text-white border-white/30 opacity-70'}`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            {/* 컬러 테마 선택 */}
            <div className="flex justify-center gap-2 mb-2">
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
          <div className="flex flex-col items-center gap-2 md:pt-6">
            <p className="text-white text-sm font-bold tracking-wide">미리보기</p>
            <div className="relative" style={{ width: previewW, height: previewH }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="미리보기"
                  className="rounded-xl shadow-2xl border-2 border-white/20 w-full h-full object-contain"
                  style={{ opacity: previewing ? 0.5 : 1, transition: 'opacity 0.2s' }}
                />
              ) : (
                <div className="rounded-xl bg-white/10 w-full h-full flex items-center justify-center">
                  <p className="text-pink-200 text-xs">사진을 선택하세요</p>
                </div>
              )}
              {previewing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              <img src={stripUrl} alt="strip" className="rounded-2xl shadow-2xl border-4 border-white/20" style={{ maxWidth: 220, maxHeight: 340, objectFit: 'contain' }} />
              <a href={stripUrl} download="인생네컷.png" className="bg-white text-purple-900 font-extrabold text-base px-6 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform w-full text-center">
                📥 내 기기에 저장
              </a>
            </div>
            <div className="bg-white rounded-3xl p-5 flex flex-col items-center gap-3 shadow-2xl">
              <p className="text-gray-700 text-sm font-bold">📱 폰으로 QR 스캔</p>
              <QRCodeDisplay url={qrUrl} size={220} />
              <p className="text-gray-500 text-xs text-center leading-relaxed">
                {isCloudMode ? '인터넷만 있으면 어디서든 스캔 가능' : '노트북 핫스팟 연결 후 스캔'}<br />스캔하면 사진 저장 가능
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
