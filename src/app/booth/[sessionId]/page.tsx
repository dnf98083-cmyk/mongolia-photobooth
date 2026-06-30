'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

const TOTAL_SHOTS = 6
const COUNTDOWN = 3

type Phase = 'setup' | 'countdown' | 'flash' | 'done'
type LayoutType = '2x2' | '1x4' | '4x1'

// ── 미리보기용 드로잉 유틸 (select 페이지의 buildStrip과 동일 디자인) ────────

function previewRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}

function previewDrawSidebar(
  ctx: CanvasRenderingContext2D, C: string, BG: string,
  sbW: number, totalH: number
) {
  const cx = 6 + sbW / 2
  ctx.fillStyle = BG
  previewRoundedRect(ctx, 6, 6, sbW, totalH - 12, 14); ctx.fill()
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
  ctx.translate(cx, totalH * 0.415); ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C
  ctx.font = `bold ${Math.round(52 * sc)}px Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MONGOLIA', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.translate(cx, totalH * 0.415 + Math.round(36 * sc)); ctx.rotate(-Math.PI / 2)
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
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`; ctx.fillText('SEOUL', cx, infoTop + li * 3)
  ctx.font = `${Math.round(10 * sc)}px sans-serif`; ctx.fillText('▼', cx, infoTop + li * 3.85)
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`; ctx.fillText('MONGOLIA', cx, infoTop + li * 4.65)
  const camY = totalH - Math.round(66 * sc)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  previewRoundedRect(ctx, cx - Math.round(20 * sc), camY - Math.round(11 * sc), Math.round(40 * sc), Math.round(26 * sc), 5); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, camY + Math.round(2 * sc), Math.round(8 * sc), 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = C
  ctx.fillRect(cx - Math.round(6 * sc), camY - Math.round(15 * sc), Math.round(12 * sc), Math.round(5 * sc))
}

function previewDrawHeader(
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

const LAYOUTS: { key: LayoutType; label: string; desc: string }[] = [
  { key: '2x2', label: '2×2', desc: '정방형' },
  { key: '1x4', label: '1×4', desc: '가로형' },
  { key: '4x1', label: '4×1', desc: '세로형' },
]

const CELL_RATIOS: Record<LayoutType, number> = {
  '2x2': 305 / 454,
  '1x4': 392 / 208,
  '4x1': 242 / 304,
}

function getCropOverlayStyle(layout: LayoutType, videoW: number, videoH: number) {
  const cellRatio = CELL_RATIOS[layout]
  const videoRatio = videoW / videoH
  if (videoRatio > cellRatio) {
    const s = ((1 - cellRatio / videoRatio) / 2 * 100).toFixed(2)
    return { left: `${s}%`, right: `${s}%`, top: '0%', bottom: '0%' }
  } else {
    const s = ((1 - videoRatio / cellRatio) / 2 * 100).toFixed(2)
    return { left: '0%', right: '0%', top: `${s}%`, bottom: `${s}%` }
  }
}

export default function BoothPage() {
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('setup')
  const [layoutType, setLayoutType] = useState<LayoutType>('2x2')
  const [shotIndex, setShotIndex] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState('')
  const [videoSize, setVideoSize] = useState({ w: 16, h: 9 })

  // setup phase 프레임 미리보기 — buildStrip과 완전히 동일한 디자인을 스케일 다운해서 그림
  useEffect(() => {
    if (phase !== 'setup') {
      cancelAnimationFrame(rafRef.current)
      return
    }

    // buildStrip과 동일한 실제 스트립 치수 및 셀 좌표
    const STRIP = {
      '2x2': { SW: 800,  SH: 1040, SB: 148, SEP_X: 158, CX_LINE: 165, SEP_Y: 70, PX0: 171, PY0: 78,  PGAP: 10, PH_BOT: 44, lineH: 13 },
      '1x4': { SW: 520,  SH: 980,  SB: 105, SEP_X: 113, CX_LINE: 118, SEP_Y: 70, PX0: 122, PY0: 78,  PGAP: 8,  PH_BOT: 44, lineH: 13 },
      '4x1': { SW: 1100, SH: 420,  SB: 80,  SEP_X: 87,  CX_LINE: 93,  SEP_Y: 62, PX0: 98,  PY0: 70,  PGAP: 8,  PH_BOT: 46, lineH: 12 },
    } as const

    const cellRatio = CELL_RATIOS[layoutType]

    const render = () => {
      const canvas = previewCanvasRef.current
      const video = videoRef.current
      if (!canvas || !video || !video.videoWidth) {
        rafRef.current = requestAnimationFrame(render); return
      }

      const ctx = canvas.getContext('2d')!
      const CW = canvas.width, CH = canvas.height
      const vw = video.videoWidth, vh = video.videoHeight
      const d = STRIP[layoutType]
      const sc = Math.min(CW / d.SW, CH / d.SH)
      const dw = Math.round(d.SW * sc), dh = Math.round(d.SH * sc)
      const ox = Math.round((CW - dw) / 2), oy = Math.round((CH - dh) / 2)

      ctx.clearRect(0, 0, CW, CH)

      // 스트립 원점으로 이동 후 sc배 축소 — 이후 모든 좌표는 실제 스트립 좌표
      ctx.save()
      ctx.translate(ox, oy)
      ctx.scale(sc, sc)

      // 흰 배경
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, d.SW, d.SH)

      // 사이드바 (select 페이지의 drawSidebar와 동일)
      previewDrawSidebar(ctx, '#1565C0', '#EEF4FF', d.SB, d.SH)

      // 외곽 테두리
      ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 4
      previewRoundedRect(ctx, 4, 4, d.SW - 8, d.SH - 8, 18); ctx.stroke()

      // 성경 구절 헤더
      const HDRCX = (d.SEP_X + d.SW) / 2
      previewDrawHeader(ctx, '#1565C0', HDRCX, 16, d.lineH)

      // 헤더 구분선
      ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(d.CX_LINE, d.SEP_Y); ctx.lineTo(d.SW - 8, d.SEP_Y); ctx.stroke()

      // 사진 셀 — 실제 스트립 좌표로 계산 (buildStrip과 동일 공식)
      const drawCell = (px: number, py: number, pw: number, ph: number) => {
        const vr = vw / vh
        let sx = 0, sy = 0, isw = vw, ish = vh
        if (vr > cellRatio) { isw = Math.round(vh * cellRatio); sx = Math.round((vw - isw) / 2) }
        else { ish = Math.round(vw / cellRatio); sy = Math.round((vh - ish) / 2) }
        ctx.save()
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip()
        ctx.translate(px + pw, py); ctx.scale(-1, 1)
        ctx.drawImage(video, sx, sy, isw, ish, 0, 0, pw, ph)
        ctx.restore()
      }

      if (layoutType === '2x2') {
        const PW = (d.SW - d.PX0 - 8 - d.PGAP) / 2
        const PH = (d.SH - d.PH_BOT - d.PY0 - d.PGAP) / 2
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++)
          drawCell(d.PX0 + c * (PW + d.PGAP), d.PY0 + r * (PH + d.PGAP), PW, PH)
      } else if (layoutType === '1x4') {
        const PW = d.SW - d.PX0 - 6
        const PH = (d.SH - d.PH_BOT - d.PY0 - d.PGAP * 3) / 4
        for (let i = 0; i < 4; i++)
          drawCell(d.PX0, d.PY0 + i * (PH + d.PGAP), PW, PH)
      } else {
        const PW = (d.SW - d.PX0 - 8 - d.PGAP * 3) / 4
        const PH = d.SH - d.PY0 - d.PH_BOT
        for (let i = 0; i < 4; i++)
          drawCell(d.PX0 + i * (PW + d.PGAP), d.PY0, PW, PH)
        // 4×1은 하단 구분선 추가
        ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(d.CX_LINE, d.SH - 38); ctx.lineTo(d.SW - 8, d.SH - 38); ctx.stroke()
      }

      // 하단 텍스트
      ctx.fillStyle = '#1565C0'
      ctx.font = '12.5px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, d.SH - 22)

      ctx.restore()

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, layoutType])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setError('카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 허용해주세요.'))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const capturePhoto = useCallback((): string => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    const vw = video.videoWidth || 1280
    const vh = video.videoHeight || 720
    const videoRatio = vw / vh
    const cellRatio = CELL_RATIOS[layoutType]

    let sx = 0, sy = 0, sw = vw, sh = vh
    if (videoRatio > cellRatio) {
      sw = Math.round(vh * cellRatio)
      sx = Math.round((vw - sw) / 2)
    } else {
      sh = Math.round(vw / cellRatio)
      sy = Math.round((vh - sh) / 2)
    }

    const MAX = 960
    const scale = Math.min(1, MAX / Math.max(sw, sh))
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.75)
  }, [layoutType])

  const startShooting = useCallback(() => {
    if (!streamRef.current) return
    setPhase('countdown')
    setShotIndex(0)
    setCountdown(COUNTDOWN)
  }, [])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
    setPhase('flash')
    const dataUrl = capturePhoto()
    setPhotos(prev => [...prev, dataUrl])
    setTimeout(() => {
      if (shotIndex + 1 < TOTAL_SHOTS) {
        setShotIndex(i => i + 1)
        setCountdown(COUNTDOWN)
        setPhase('countdown')
      } else {
        setPhase('done')
      }
    }, 800)
  }, [phase, countdown, shotIndex, capturePhoto])

  function finishAndGoSelect() {
    sessionStorage.setItem(`photos_${sessionId}`, JSON.stringify(photos))
    router.push(`/select/${sessionId}?layout=${layoutType}`)
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center text-white">
          <p className="text-2xl mb-4">⚠️</p>
          <p className="text-red-400">{error}</p>
        </div>
      </main>
    )
  }

  const cropStyle = getCropOverlayStyle(layoutType, videoSize.w, videoSize.h)

  return (
    <main className="bg-black flex flex-col overflow-hidden" style={{ height: '100dvh' }}>

      {/* 플래시 */}
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping"
          style={{ animationDuration: '0.15s', animationIterationCount: 1 }} />
      )}

      {/* 카메라 영역 — video는 항상 유지 (스트림 유지 필수) */}
      <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">

        {/* 비디오 — setup에서는 숨김, 촬영 중에만 표시 */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          onLoadedMetadata={e => {
            const v = e.currentTarget
            if (v.videoWidth) setVideoSize({ w: v.videoWidth, h: v.videoHeight })
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity"
          style={{ transform: 'scaleX(-1)', opacity: phase === 'setup' ? 0 : 1 }}
        />

        {/* 프레임 미리보기 캔버스 — setup 전용, 전체화면 */}
        {phase === 'setup' && (
          <canvas
            ref={previewCanvasRef}
            width={layoutType === '4x1' ? 560 : layoutType === '1x4' ? 300 : 480}
            height={layoutType === '4x1' ? 214 : layoutType === '1x4' ? 566 : 624}
            className="rounded-2xl shadow-2xl z-10"
            style={{ maxWidth: '96%', maxHeight: '96%', width: 'auto', height: 'auto' }}
          />
        )}

        {/* 크롭 가이드 — 촬영 중에만 표시 */}
        {phase !== 'setup' && (
          <div
            className="absolute pointer-events-none rounded-xl transition-all duration-300 z-10"
            style={{
              left: cropStyle.left, right: cropStyle.right,
              top: cropStyle.top, bottom: cropStyle.bottom,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              border: '2.5px solid rgba(255,255,255,0.95)',
            }}
          />
        )}

        {/* 카운트다운 */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center z-20"
            style={{ left: cropStyle.left, right: cropStyle.right }}>
            <span className="text-white font-black drop-shadow-2xl"
              style={{ fontSize: 'min(20vw, 160px)', lineHeight: 1 }}>
              {countdown === 0 ? '📸' : countdown}
            </span>
          </div>
        )}

        {/* 촬영 진행 도트 */}
        {(phase === 'countdown' || phase === 'flash' || phase === 'done') && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-20">
            {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
              <div key={i}
                className={`w-3 h-3 rounded-full border-2 border-white transition-all ${i < photos.length ? 'bg-pink-400' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="bg-black shrink-0">

        {/* setup: 레이아웃 선택 + 촬영 버튼 */}
        {phase === 'setup' && (
          <div className="px-5 pt-3 pb-4 flex flex-col items-center gap-3">
            <p className="text-white/50 text-xs font-semibold tracking-widest">프레임 선택 — 미리보기에서 위치를 확인하세요</p>
            <div className="flex gap-2">
              {LAYOUTS.map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setLayoutType(key)}
                  className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl font-bold transition-all ${
                    layoutType === key
                      ? 'bg-white text-black scale-105 shadow-lg'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <span className="text-sm font-black">{label}</span>
                  <span className="text-xs opacity-70">{desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={startShooting}
              className="w-full max-w-xs bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-extrabold text-lg py-3 rounded-full shadow-xl transition-all"
            >
              촬영 시작 📸
            </button>
          </div>
        )}

        {/* countdown/flash: 촬영 중 */}
        {(phase === 'countdown' || phase === 'flash') && (
          <div className="py-4 text-center">
            <p className="text-white text-base font-semibold">
              {shotIndex + 1} / {TOTAL_SHOTS} 번째 촬영 중...
            </p>
          </div>
        )}

        {/* done: 썸네일 + 이동 버튼 */}
        {phase === 'done' && (
          <div className="px-4 pt-3 pb-6 flex flex-col gap-3">
            <div className="flex gap-2 justify-center">
              {photos.map((p, i) => (
                <img key={i} src={p} alt={`shot-${i}`}
                  className="w-14 h-14 object-cover rounded-lg border-2 border-pink-400" />
              ))}
            </div>
            <button
              onClick={finishAndGoSelect}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg py-4 rounded-full shadow-lg transition-colors"
            >
              사진 고르러 가기 →
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  )
}
