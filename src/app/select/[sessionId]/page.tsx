'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { uploadStripToCloud } from '@/lib/cloudStorage'

type ColorTheme = 'pink' | 'yellow' | 'green' | 'blue'
type LayoutType = '2x2' | '1x4' | '4x1'
type Phase = 'select' | 'preview' | 'done'

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
  src: string, px: number, py: number, pw: number, ph: number,
  bgColor = '#ffffff'
) {
  await new Promise<void>(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.save()
      roundedRect(ctx, px, py, pw, ph, 10); ctx.clip()
      ctx.fillStyle = bgColor
      ctx.fillRect(px, py, pw, ph)
      const scale = Math.min(pw / img.width, ph / img.height)
      const dw = img.width * scale, dh = img.height * scale
      const dx = px + (pw - dw) / 2, dy = py + (ph - dh) / 2
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh)
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
  ctx.fillStyle = BG
  roundedRect(ctx, 6, 6, sbW, totalH - 12, 14); ctx.fill()
  ctx.strokeStyle = C; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(6 + sbW + 4, 14); ctx.lineTo(6 + sbW + 4, totalH - 14); ctx.stroke()
  const sc = sbW / 148
  const iconR = Math.round(28 * sc)
  const iconY = Math.round(55 * sc + iconR)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1.5, 2 * sc)
  ctx.beginPath(); ctx.arc(cx, iconY, iconR, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = Math.max(2, 3 * sc)
  ctx.beginPath(); ctx.moveTo(cx, iconY - iconR * 0.55); ctx.lineTo(cx, iconY + iconR * 0.48); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - iconR * 0.46, iconY - iconR * 0.15); ctx.lineTo(cx + iconR * 0.46, iconY - iconR * 0.15); ctx.stroke()
  ctx.save()
  ctx.translate(cx, totalH * 0.415)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(52 * sc)}px Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MONGOLIA', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.translate(cx, totalH * 0.415 + Math.round(36 * sc))
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(10 * sc)}px Arial, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MISSION  YOUTH  CAMP', 0, 0)
  ctx.restore()
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
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  ctx.beginPath()
  ctx.moveTo(cx, stY - Math.round(18 * sc))
  ctx.lineTo(cx - Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.lineTo(cx + Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.closePath(); ctx.stroke()
  ctx.fillStyle = C
  ctx.font = `${Math.round(10 * sc)}px sans-serif`
  ctx.fillText('★', cx - Math.round(34 * sc), stY + 1)
  ctx.fillText('★', cx + Math.round(34 * sc), stY + 1)
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

function SelectPageContent() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const searchParams = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const layoutType = (searchParams.get('layout') as LayoutType) || '2x2'

  const [phase, setPhase] = useState<Phase>('select')
  const [photos, setPhotos] = useState<string[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [colorTheme, setColorTheme] = useState<ColorTheme>('pink')

  const [stripDataUrl, setStripDataUrl] = useState('')
  const [generating, setGenerating] = useState(false)

  const [qrUrl, setQrUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCloudMode, setIsCloudMode] = useState(false)
  const [localIP, setLocalIP] = useState('')

  // 미리보기 진입 즉시 백그라운드 업로드 시작 — 저장하기 클릭 시 이미 완료되어 있을 가능성 높음
  const cloudUploadRef = useRef<{ dataUrl: string; promise: Promise<string | null> } | null>(null)

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
          if (photos[selected[idx]]) await drawPhoto(ctx, photos[selected[idx]], px, py, PW, PH, BG)
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
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], PX, py, PW, PH, BG)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
        roundedRect(ctx, PX, py, PW, PH, 8); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 12px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText(`${NUM_LABELS[i]} ${NUM_ICONS[i]}`, PX + 7, py + 7)
      }
      ctx.fillStyle = C; ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, H - 22)

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
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], px, PY, PW, PH, BG)
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

  async function handleConfirmSelect() {
    setGenerating(true)
    const dataUrl = await buildStrip()
    setStripDataUrl(dataUrl)
    setGenerating(false)
    setPhase('preview')
  }

  async function handleSave() {
    setSaving(true)
    // 로컬 저장과 클라우드 업로드는 미리보기 진입 시 이미 시작됨
    // 혹시 아직 시작 안 됐거나 다른 dataUrl이면 새로 시작
    const uploadPromise = cloudUploadRef.current?.dataUrl === stripDataUrl
      ? cloudUploadRef.current.promise
      : uploadStripToCloud(sessionId, stripDataUrl)
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 10000))
    const cloudUrl = await Promise.race([uploadPromise, timeout])
    const ip = localIP || '192.168.137.1'
    const proto = window.location.protocol
    if (cloudUrl) {
      setIsCloudMode(true); setQrUrl(cloudUrl)
    } else {
      setIsCloudMode(false)
      setQrUrl(`${proto}//${ip}:3000/download/${sessionId}`)
    }
    setSaving(false)
    setPhase('done')
  }

  // 미리보기에서 색상 바꾸면 스트립 즉시 재생성 (훅은 return 전에 위치해야 함)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'preview') return
    let cancelled = false
    setGenerating(true)
    buildStrip().then(url => {
      if (!cancelled) { setStripDataUrl(url); setGenerating(false) }
    })
    return () => { cancelled = true }
  }, [colorTheme])

  // 스트립 생성되는 즉시 백그라운드에서 로컬 저장 + 클라우드 업로드 시작
  useEffect(() => {
    if (!stripDataUrl || phase !== 'preview') return
    // 로컬 서버에 저장 (fire & forget — 색상 바뀌면 덮어쓰기)
    fetch(`/api/sessions/${sessionId}/strip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: stripDataUrl }),
    })
    // 클라우드 업로드 시작 — 최신 dataUrl과 Promise를 ref에 보관
    cloudUploadRef.current = {
      dataUrl: stripDataUrl,
      promise: uploadStripToCloud(sessionId, stripDataUrl),
    }
  }, [stripDataUrl, phase, sessionId])

  return (
    <main className="bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700" style={{ height: '100dvh' }}>
      {/* canvas는 항상 DOM에 유지 — phase 전환 시 null 방지 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Phase: 사진 고르기 ── */}
      {phase === 'select' && (
        <div className="flex flex-col p-3 gap-2 h-full">
          <div className="text-center">
            <h1 className="text-white text-xl font-black">사진 4장 고르기</h1>
            <p className="text-pink-200 text-xs mt-0.5">{selected.length} / {REQUIRED} 선택됨</p>
          </div>

          <div className="grid grid-cols-3 gap-2 flex-1 content-center">
            {photos.map((url, i) => {
              const selIdx = selected.indexOf(i)
              const isSelected = selIdx !== -1
              return (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all active:scale-95 ${
                    isSelected ? 'border-yellow-400' : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  <img src={url} alt={`photo-${i}`} className="w-full aspect-video object-cover" style={{ transform: 'scaleX(-1)' }} />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-yellow-400 text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow">
                      {selIdx + 1}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-center pb-1">
            <button
              onClick={handleConfirmSelect}
              disabled={selected.length !== REQUIRED || generating}
              className="bg-white text-purple-900 font-extrabold text-lg px-12 py-3.5 rounded-full shadow-xl disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
            >
              {generating ? '생성 중...' : `선택 완료 (${selected.length}/${REQUIRED})`}
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: 미리보기 ── */}
      {phase === 'preview' && (
        <div className="flex flex-col items-center justify-center gap-4 p-5 h-full">
          <p className="text-white text-xl font-black tracking-wide">미리보기</p>

          <div className="flex gap-3 items-center">
            {(Object.entries(THEMES) as [ColorTheme, typeof THEMES.pink][]).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                title={t.label}
                className={`w-9 h-9 rounded-full border-4 transition-all ${colorTheme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                style={{ backgroundColor: t.primary }}
              />
            ))}
            {generating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />}
          </div>

          <img
            src={stripDataUrl}
            alt="스트립 미리보기"
            className="rounded-2xl shadow-2xl border-2 border-white/20 transition-opacity"
            style={{ maxWidth: '100%', maxHeight: '68dvh', objectFit: 'contain', opacity: generating ? 0.5 : 1 }}
          />

          <div className="flex gap-4">
            <button
              onClick={() => setPhase('select')}
              className="bg-white/20 text-white font-bold px-7 py-3 rounded-full border border-white/30 hover:bg-white/30 active:scale-95 transition-all"
            >
              ← 다시 선택
            </button>
            <button
              onClick={handleSave}
              disabled={saving || generating}
              className="bg-white text-purple-900 font-extrabold px-9 py-3 rounded-full shadow-xl disabled:opacity-60 hover:scale-105 active:scale-95 transition-all"
            >
              {saving ? '저장 중...' : '저장하기 →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: 저장 완료 + QR ── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center justify-center gap-5 p-4 h-full">
          <div className="text-center">
            <p className="text-pink-200 text-xs tracking-widest mb-1">자양교회 몽골 선교</p>
            <h1 className="text-white text-3xl font-black">완성!</h1>
          </div>

          <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${isCloudMode ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`}>
            {isCloudMode ? '🌐 온라인 — 어디서든 스캔 가능' : '📡 오프라인 — 핫스팟 연결 후 스캔'}
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <img src={stripDataUrl} alt="strip" className="rounded-2xl shadow-2xl border-4 border-white/20" style={{ maxWidth: 200, maxHeight: 300, objectFit: 'contain' }} />
              <a href={stripDataUrl} download="인생네컷.png" className="bg-white text-purple-900 font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform w-full text-center text-sm">
                📥 내 기기에 저장
              </a>
            </div>

            <div className="bg-white rounded-3xl p-5 flex flex-col items-center gap-2 shadow-2xl">
              <p className="text-gray-700 text-sm font-bold">📱 폰으로 QR 스캔</p>
              <QRCodeDisplay url={qrUrl} size={200} />
              <p className="text-gray-400 text-xs text-center">
                {isCloudMode ? '인터넷만 있으면 어디서든' : '핫스팟 연결 후 스캔'}
              </p>
            </div>
          </div>

          <a href="/" className="bg-white/20 text-white font-bold px-8 py-3 rounded-full hover:bg-white/30 active:scale-95 transition-all text-sm">
            처음으로 돌아가기
          </a>
        </div>
      )}
    </main>
  )
}

export default function SelectPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex items-center justify-center">
        <p className="text-white text-lg">로딩 중...</p>
      </main>
    }>
      <SelectPageContent />
    </Suspense>
  )
}
