'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const QRCodeDisplay = dynamic(() => import('@/components/QRCodeDisplay'), { ssr: false })
const getUploader = () => import('@/lib/cloudStorage').then(m => m.uploadStripToCloud)

const TOTAL_SHOTS = 6
const COUNTDOWN = 3
const REQUIRED = 4

type Phase = 'setup' | 'countdown' | 'flash' | 'done' | 'select' | 'preview' | 'done_qr'
type LayoutType = '2x2' | '1x4' | '4x1'
type ColorTheme = 'pink' | 'yellow' | 'green' | 'blue'

const THEMES: Record<ColorTheme, { primary: string; bg: string; label: string }> = {
  pink:   { primary: '#E91E8C', bg: '#FFF5FA', label: '핑크' },
  yellow: { primary: '#D4900A', bg: '#FFFDF0', label: '옐로우' },
  green:  { primary: '#2E7D32', bg: '#F0FFF2', label: '그린' },
  blue:   { primary: '#1565C0', bg: '#EEF4FF', label: '블루' },
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

// ── 캔버스 드로잉 유틸 ──────────────────────────────────────────────────────

function roundedRect(
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

async function drawPhoto(
  ctx: CanvasRenderingContext2D,
  src: string, px: number, py: number, pw: number, ph: number,
  bgColor = '#ffffff'
) {
  await new Promise<void>(resolve => {
    const img = new Image()
    img.onload = () => {
      ctx.save()
      roundedRect(ctx, px, py, pw, ph, 10); ctx.clip()
      ctx.fillStyle = bgColor; ctx.fillRect(px, py, pw, ph)
      const scale = Math.min(pw / img.width, ph / img.height)
      const dw = img.width * scale, dh = img.height * scale
      ctx.drawImage(img, 0, 0, img.width, img.height,
        px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh)
      ctx.restore(); resolve()
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
  ctx.save(); ctx.translate(cx, totalH * 0.415); ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C; ctx.font = `bold ${Math.round(52 * sc)}px Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MONGOLIA', 0, 0); ctx.restore()
  ctx.save(); ctx.translate(cx, totalH * 0.415 + Math.round(36 * sc)); ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = C; ctx.font = `bold ${Math.round(10 * sc)}px Arial, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MISSION  YOUTH  CAMP', 0, 0); ctx.restore()
  const stY = Math.round(totalH * 0.625), stR = Math.round(50 * sc)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  ctx.beginPath(); ctx.arc(cx, stY, stR, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, stY, stR - Math.round(9 * sc), 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = C; ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('MISSION', cx, stY - stR + Math.round(17 * sc))
  ctx.fillText('COMPLETE!', cx, stY + stR - Math.round(17 * sc))
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  ctx.beginPath()
  ctx.moveTo(cx, stY - Math.round(18 * sc))
  ctx.lineTo(cx - Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.lineTo(cx + Math.round(18 * sc), stY + Math.round(8 * sc))
  ctx.closePath(); ctx.stroke()
  ctx.fillStyle = C; ctx.font = `${Math.round(10 * sc)}px sans-serif`
  ctx.fillText('★', cx - Math.round(34 * sc), stY + 1)
  ctx.fillText('★', cx + Math.round(34 * sc), stY + 1)
  const infoTop = totalH * 0.762, li = Math.round(20 * sc)
  ctx.fillStyle = C; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(19 * sc)}px Arial, sans-serif`; ctx.fillText('2026', cx, infoTop)
  ctx.font = `${Math.round(9 * sc)}px sans-serif`; ctx.fillText('- -', cx, infoTop + li * 1.1)
  ctx.font = `${Math.round(14 * sc)}px sans-serif`; ctx.fillText('✈', cx, infoTop + li * 2.1)
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`; ctx.fillText('SEOUL', cx, infoTop + li * 3)
  ctx.font = `${Math.round(10 * sc)}px sans-serif`; ctx.fillText('▼', cx, infoTop + li * 3.85)
  ctx.font = `bold ${Math.round(9 * sc)}px Arial, sans-serif`; ctx.fillText('MONGOLIA', cx, infoTop + li * 4.65)
  const camY = totalH - Math.round(66 * sc)
  ctx.strokeStyle = C; ctx.lineWidth = Math.max(1, 2 * sc)
  roundedRect(ctx, cx - Math.round(20 * sc), camY - Math.round(11 * sc), Math.round(40 * sc), Math.round(26 * sc), 5); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, camY + Math.round(2 * sc), Math.round(8 * sc), 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = C; ctx.fillRect(cx - Math.round(6 * sc), camY - Math.round(15 * sc), Math.round(12 * sc), Math.round(5 * sc))
}

function drawHeader(
  ctx: CanvasRenderingContext2D, C: string,
  cx: number, startY: number, lineH: number
) {
  ctx.fillStyle = C; ctx.font = 'italic 11px Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('For God so loved the world that He gave', cx, startY)
  ctx.fillText('His one and only Son, that whoever believes in', cx, startY + lineH)
  ctx.fillText('Him shall not perish but have eternal life.    John 3:16', cx, startY + lineH * 2)
  ctx.font = '14px sans-serif'; ctx.textBaseline = 'middle'
  ctx.fillText('✦', cx - 155, startY + lineH)
  ctx.fillText('✦', cx + 155, startY + lineH)
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
  const { sessionId } = useParams<{ sessionId: string }>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const cloudUploadRef = useRef<{ dataUrl: string; promise: Promise<string | null> } | null>(null)
  const prebuiltStripRef = useRef<{ selected: number[]; theme: ColorTheme; url: string } | null>(null)

  // ── Booth state ──
  const [phase, setPhase] = useState<Phase>('setup')
  const [layoutType, setLayoutType] = useState<LayoutType>('2x2')
  const [shotIndex, setShotIndex] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState('')
  const [videoSize, setVideoSize] = useState({ w: 16, h: 9 })

  // ── Select / Preview / QR state ──
  const [selected, setSelected] = useState<number[]>([])
  const [colorTheme, setColorTheme] = useState<ColorTheme>('pink')
  const [stripDataUrl, setStripDataUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [isCloudMode, setIsCloudMode] = useState(false)
  const [localIP, setLocalIP] = useState('')

  // ── 라이브 미리보기 (setup phase) ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'setup') { cancelAnimationFrame(rafRef.current); return }
    const STRIP = {
      '2x2': { SW: 800,  SH: 1040, SB: 148, SEP_X: 158, CX_LINE: 165, SEP_Y: 70, PX0: 171, PY0: 78,  PGAP: 10, PH_BOT: 44, lineH: 13 },
      '1x4': { SW: 520,  SH: 980,  SB: 105, SEP_X: 113, CX_LINE: 118, SEP_Y: 70, PX0: 122, PY0: 78,  PGAP: 8,  PH_BOT: 44, lineH: 13 },
      '4x1': { SW: 1100, SH: 420,  SB: 80,  SEP_X: 87,  CX_LINE: 93,  SEP_Y: 62, PX0: 98,  PY0: 70,  PGAP: 8,  PH_BOT: 46, lineH: 12 },
    } as const
    const cellRatio = CELL_RATIOS[layoutType]
    const render = () => {
      const canvas = previewCanvasRef.current
      const video = videoRef.current
      if (!canvas || !video || !video.videoWidth) { rafRef.current = requestAnimationFrame(render); return }
      const ctx = canvas.getContext('2d')!
      const CW = canvas.width, CH = canvas.height
      const vw = video.videoWidth, vh = video.videoHeight
      const d = STRIP[layoutType]
      const sc = Math.min(CW / d.SW, CH / d.SH)
      const dw = Math.round(d.SW * sc), dh = Math.round(d.SH * sc)
      const ox = Math.round((CW - dw) / 2), oy = Math.round((CH - dh) / 2)
      ctx.clearRect(0, 0, CW, CH)
      ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc)
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, d.SW, d.SH)
      drawSidebar(ctx, '#1565C0', '#EEF4FF', d.SB, d.SH)
      ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 4
      roundedRect(ctx, 4, 4, d.SW - 8, d.SH - 8, 18); ctx.stroke()
      const HDRCX = (d.SEP_X + d.SW) / 2
      drawHeader(ctx, '#1565C0', HDRCX, 16, d.lineH)
      ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(d.CX_LINE, d.SEP_Y); ctx.lineTo(d.SW - 8, d.SEP_Y); ctx.stroke()
      const drawCell = (px: number, py: number, pw: number, ph: number) => {
        const vr = vw / vh
        let sx = 0, sy = 0, isw = vw, ish = vh
        if (vr > cellRatio) { isw = Math.round(vh * cellRatio); sx = Math.round((vw - isw) / 2) }
        else { ish = Math.round(vw / cellRatio); sy = Math.round((vh - ish) / 2) }
        ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip()
        ctx.translate(px + pw, py); ctx.scale(-1, 1)
        ctx.drawImage(video, sx, sy, isw, ish, 0, 0, pw, ph); ctx.restore()
      }
      if (layoutType === '2x2') {
        const PW = (d.SW - d.PX0 - 8 - d.PGAP) / 2
        const PH = (d.SH - d.PH_BOT - d.PY0 - d.PGAP) / 2
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++)
          drawCell(d.PX0 + c * (PW + d.PGAP), d.PY0 + r * (PH + d.PGAP), PW, PH)
      } else if (layoutType === '1x4') {
        const PW = d.SW - d.PX0 - 6
        const PH = (d.SH - d.PH_BOT - d.PY0 - d.PGAP * 3) / 4
        for (let i = 0; i < 4; i++) drawCell(d.PX0, d.PY0 + i * (PH + d.PGAP), PW, PH)
      } else {
        const PW = (d.SW - d.PX0 - 8 - d.PGAP * 3) / 4
        const PH = d.SH - d.PY0 - d.PH_BOT
        for (let i = 0; i < 4; i++) drawCell(d.PX0 + i * (PW + d.PGAP), d.PY0, PW, PH)
        ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(d.CX_LINE, d.SH - 38); ctx.lineTo(d.SW - 8, d.SH - 38); ctx.stroke()
      }
      ctx.fillStyle = '#1565C0'; ctx.font = '12.5px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, d.SH - 22)
      ctx.restore()
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, layoutType])

  // ── 카메라 초기화 ────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setError('카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 허용해주세요.'))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // ── 로컬 IP 조회 ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/local-ip').then(r => r.json()).then(d => setLocalIP(d.ip))
  }, [])

  // ── 사진 캡처 ────────────────────────────────────────────────────────────
  const capturePhoto = useCallback((): string => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720
    const cellRatio = CELL_RATIOS[layoutType]
    const videoRatio = vw / vh
    let sx = 0, sy = 0, sw = vw, sh = vh
    if (videoRatio > cellRatio) { sw = Math.round(vh * cellRatio); sx = Math.round((vw - sw) / 2) }
    else { sh = Math.round(vw / cellRatio); sy = Math.round((vh - sh) / 2) }
    const MAX = 960, scale = Math.min(1, MAX / Math.max(sw, sh))
    canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.75)
  }, [layoutType])

  // ── 카운트다운 / 촬영 ────────────────────────────────────────────────────
  const startShooting = useCallback(() => {
    if (!streamRef.current) return
    setPhase('countdown'); setShotIndex(0); setCountdown(COUNTDOWN)
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
        setShotIndex(i => i + 1); setCountdown(COUNTDOWN); setPhase('countdown')
      } else {
        setPhase('done')
      }
    }, 800)
  }, [phase, countdown, shotIndex, capturePhoto])

  // ── 스트립 생성 ──────────────────────────────────────────────────────────
  const buildStrip = useCallback(async () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { primary: C, bg: BG } = THEMES[colorTheme]
    const NL = ['01', '02', '03', '04'], NI = ['◎', '☆', '♡', '✎']

    if (layoutType === '2x2') {
      const W = 800, H = 1040
      canvas.width = W; canvas.height = H
      const SB_W = 148, CONT_X = 165, SEP_X = 158
      ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, W, H)
      drawSidebar(ctx, C, BG, SB_W, H)
      ctx.strokeStyle = C; ctx.lineWidth = 4; roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 13)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 70); ctx.lineTo(W - 8, 70); ctx.stroke()
      const PX0 = CONT_X + 6, PY0 = 78, PGAP = 10
      const PW = (W - PX0 - 8 - PGAP) / 2, PH = (H - 44 - PY0 - PGAP) / 2
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col, px = PX0 + col * (PW + PGAP), py = PY0 + row * (PH + PGAP)
        ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, px, py, PW, PH, 10); ctx.fill()
        if (photos[selected[idx]]) await drawPhoto(ctx, photos[selected[idx]], px, py, PW, PH, BG)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; roundedRect(ctx, px, py, PW, PH, 10); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 13px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${NL[idx]} ${NI[idx]}`, px + 8, py + 8)
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
      ctx.strokeStyle = C; ctx.lineWidth = 4; roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 13)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 70); ctx.lineTo(W - 8, 70); ctx.stroke()
      const PX = CONT_X + 4, PY0 = 78, PGAP = 8
      const PW = W - PX - 6, PH = (H - 44 - PY0 - PGAP * 3) / 4
      for (let i = 0; i < 4; i++) {
        const py = PY0 + i * (PH + PGAP)
        ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, PX, py, PW, PH, 8); ctx.fill()
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], PX, py, PW, PH, BG)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; roundedRect(ctx, PX, py, PW, PH, 8); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 12px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${NL[i]} ${NI[i]}`, PX + 7, py + 7)
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
      ctx.strokeStyle = C; ctx.lineWidth = 4; roundedRect(ctx, 4, 4, W - 8, H - 8, 18); ctx.stroke()
      const HDRCX = (SEP_X + W) / 2
      drawHeader(ctx, C, HDRCX, 16, 12)
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, 62); ctx.lineTo(W - 8, 62); ctx.stroke()
      const PX0 = CONT_X + 5, PY = 70, PGAP = 8
      const PW = (W - PX0 - 8 - PGAP * 3) / 4, PH = H - PY - 46
      for (let i = 0; i < 4; i++) {
        const px = PX0 + i * (PW + PGAP)
        ctx.fillStyle = '#E0E0E0'; roundedRect(ctx, px, PY, PW, PH, 8); ctx.fill()
        if (photos[selected[i]]) await drawPhoto(ctx, photos[selected[i]], px, PY, PW, PH, BG)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; roundedRect(ctx, px, PY, PW, PH, 8); ctx.stroke()
        ctx.fillStyle = C; ctx.font = 'bold 12px Arial, sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${NL[i]} ${NI[i]}`, px + 7, PY + 7)
      }
      ctx.strokeStyle = C; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(CONT_X, H - 38); ctx.lineTo(W - 8, H - 38); ctx.stroke()
      ctx.fillStyle = C; ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('· + · LOVED BEYOND BORDERS · + ·', HDRCX, H - 20)
    }
    return canvas.toDataURL('image/png')
  }, [selected, photos, colorTheme, layoutType])

  // ── 4장 선택 완료 시 백그라운드 스트립 미리 생성 ─────────────────────────
  useEffect(() => {
    if (selected.length !== REQUIRED || phase !== 'select') {
      prebuiltStripRef.current = null; return
    }
    let cancelled = false
    buildStrip().then(url => {
      if (!cancelled) prebuiltStripRef.current = { selected: [...selected], theme: colorTheme, url }
    })
    return () => { cancelled = true }
  }, [selected, colorTheme, buildStrip, phase])

  // ── 색상 변경 시 스트립 재생성 (preview phase) ────────────────────────────
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

  // ── 스트립 완성 즉시 로컬 저장 + 클라우드 업로드 시작 ────────────────────
  useEffect(() => {
    if (!stripDataUrl || phase !== 'preview') return
    fetch(`/api/sessions/${sessionId}/strip`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: stripDataUrl }),
    })
    cloudUploadRef.current = {
      dataUrl: stripDataUrl,
      promise: getUploader().then(fn => fn(sessionId, stripDataUrl)),
    }
  }, [stripDataUrl, phase, sessionId])

  // ── 핸들러 ──────────────────────────────────────────────────────────────
  function toggleSelect(i: number) {
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i)
      if (prev.length >= REQUIRED) return prev
      return [...prev, i]
    })
  }

  async function handleConfirmSelect() {
    const pre = prebuiltStripRef.current
    if (pre && pre.theme === colorTheme && pre.selected.join() === selected.join()) {
      setStripDataUrl(pre.url); setPhase('preview'); return
    }
    setGenerating(true)
    const dataUrl = await buildStrip()
    setStripDataUrl(dataUrl); setGenerating(false); setPhase('preview')
  }

  function handleSave() {
    const ip = localIP || '192.168.137.1'
    const proto = window.location.protocol
    setIsCloudMode(false)
    setQrUrl(`${proto}//${ip}:3000/download/${sessionId}`)
    setPhase('done_qr')
    const uploadPromise = cloudUploadRef.current?.dataUrl === stripDataUrl
      ? cloudUploadRef.current.promise
      : getUploader().then(fn => fn(sessionId, stripDataUrl))
    uploadPromise.then((cloudUrl: string | null) => {
      if (cloudUrl) { setIsCloudMode(true); setQrUrl(cloudUrl) }
    })
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────
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
  const isShootPhase = phase === 'setup' || phase === 'countdown' || phase === 'flash' || phase === 'done'

  return (
    <main className={isShootPhase ? 'bg-black flex flex-col overflow-hidden' : 'bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700'}
      style={{ height: '100dvh' }}>

      {/* ── 촬영 화면 (setup / countdown / flash / done) ── */}
      {isShootPhase && (<>
        {phase === 'flash' && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping"
            style={{ animationDuration: '0.15s', animationIterationCount: 1 }} />
        )}

        <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef} autoPlay playsInline muted
            onLoadedMetadata={e => {
              const v = e.currentTarget
              if (v.videoWidth) setVideoSize({ w: v.videoWidth, h: v.videoHeight })
            }}
            className="absolute inset-0 w-full h-full object-cover transition-opacity"
            style={{ transform: 'scaleX(-1)', opacity: phase === 'setup' ? 0 : 1 }}
          />
          {phase === 'setup' && (
            <canvas
              ref={previewCanvasRef}
              width={layoutType === '4x1' ? 560 : layoutType === '1x4' ? 300 : 480}
              height={layoutType === '4x1' ? 214 : layoutType === '1x4' ? 566 : 624}
              className="rounded-2xl shadow-2xl z-10"
              style={{ maxWidth: '96%', maxHeight: '96%', width: 'auto', height: 'auto' }}
            />
          )}
          {phase !== 'setup' && (
            <div className="absolute pointer-events-none rounded-xl transition-all duration-300 z-10"
              style={{
                left: cropStyle.left, right: cropStyle.right,
                top: cropStyle.top, bottom: cropStyle.bottom,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                border: '2.5px solid rgba(255,255,255,0.95)',
              }} />
          )}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center z-20"
              style={{ left: cropStyle.left, right: cropStyle.right }}>
              <span className="text-white font-black drop-shadow-2xl"
                style={{ fontSize: 'min(20vw, 160px)', lineHeight: 1 }}>
                {countdown === 0 ? '📸' : countdown}
              </span>
            </div>
          )}
          {(phase === 'countdown' || phase === 'flash' || phase === 'done') && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-20">
              {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full border-2 border-white transition-all ${i < photos.length ? 'bg-pink-400' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-black shrink-0">
          {phase === 'setup' && (
            <div className="px-5 pt-3 pb-4 flex flex-col items-center gap-3">
              <p className="text-white/50 text-xs font-semibold tracking-widest">프레임 선택 — 미리보기에서 위치를 확인하세요</p>
              <div className="flex gap-2">
                {LAYOUTS.map(({ key, label, desc }) => (
                  <button key={key} onClick={() => setLayoutType(key)}
                    className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl font-bold transition-all ${
                      layoutType === key ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}>
                    <span className="text-sm font-black">{label}</span>
                    <span className="text-xs opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
              <button onClick={startShooting}
                className="w-full max-w-xs bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-extrabold text-lg py-3 rounded-full shadow-xl transition-all">
                촬영 시작 📸
              </button>
            </div>
          )}
          {(phase === 'countdown' || phase === 'flash') && (
            <div className="py-4 text-center">
              <p className="text-white text-base font-semibold">{shotIndex + 1} / {TOTAL_SHOTS} 번째 촬영 중...</p>
            </div>
          )}
          {phase === 'done' && (
            <div className="px-4 pt-3 pb-6 flex flex-col gap-3">
              <div className="flex gap-2 justify-center">
                {photos.map((p, i) => (
                  <img key={i} src={p} alt={`shot-${i}`}
                    className="w-14 h-14 object-cover rounded-lg border-2 border-pink-400" />
                ))}
              </div>
              <button onClick={() => { setSelected([]); setPhase('select') }}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg py-4 rounded-full shadow-lg transition-colors">
                사진 고르러 가기 →
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </>)}

      {/* ── 사진 고르기 (select) ── */}
      {phase === 'select' && (
        <div className="flex flex-col p-3 gap-2 h-full">
          <canvas ref={canvasRef} className="hidden" />
          <div className="text-center">
            <h1 className="text-white text-xl font-black">사진 4장 고르기</h1>
            <p className="text-pink-200 text-xs mt-0.5">{selected.length} / {REQUIRED} 선택됨</p>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 content-center">
            {photos.map((url, i) => {
              const selIdx = selected.indexOf(i)
              const isSelected = selIdx !== -1
              return (
                <div key={i} onClick={() => toggleSelect(i)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all active:scale-95 ${
                    isSelected ? 'border-yellow-400' : 'border-transparent opacity-60 hover:opacity-80'
                  }`}>
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
            <button onClick={handleConfirmSelect}
              disabled={selected.length !== REQUIRED || generating}
              className="bg-white text-purple-900 font-extrabold text-lg px-12 py-3.5 rounded-full shadow-xl disabled:opacity-40 hover:scale-105 active:scale-95 transition-all">
              {generating ? '생성 중...' : `선택 완료 (${selected.length}/${REQUIRED})`}
            </button>
          </div>
        </div>
      )}

      {/* ── 미리보기 (preview) ── */}
      {phase === 'preview' && (
        <div className="flex flex-col items-center justify-center gap-4 p-5 h-full">
          {phase === 'preview' && <canvas ref={canvasRef} className="hidden" />}
          <p className="text-white text-xl font-black tracking-wide">미리보기</p>
          <div className="flex gap-3 items-center">
            {(Object.entries(THEMES) as [ColorTheme, typeof THEMES.pink][]).map(([key, t]) => (
              <button key={key} onClick={() => setColorTheme(key)} title={t.label}
                className={`w-9 h-9 rounded-full border-4 transition-all ${colorTheme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                style={{ backgroundColor: t.primary }} />
            ))}
            {generating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />}
          </div>
          <img src={stripDataUrl} alt="스트립 미리보기" className="rounded-2xl shadow-2xl border-2 border-white/20 transition-opacity"
            style={{ maxWidth: '100%', maxHeight: '68dvh', objectFit: 'contain', opacity: generating ? 0.5 : 1 }} />
          <div className="flex gap-4">
            <button onClick={() => setPhase('select')}
              className="bg-white/20 text-white font-bold px-7 py-3 rounded-full border border-white/30 hover:bg-white/30 active:scale-95 transition-all">
              ← 다시 선택
            </button>
            <button onClick={handleSave} disabled={generating}
              className="bg-white text-purple-900 font-extrabold px-9 py-3 rounded-full shadow-xl disabled:opacity-60 hover:scale-105 active:scale-95 transition-all">
              저장하기 →
            </button>
          </div>
        </div>
      )}

      {/* ── QR 화면 (done_qr) ── */}
      {phase === 'done_qr' && (
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
              <img src={stripDataUrl} alt="strip" className="rounded-2xl shadow-2xl border-4 border-white/20"
                style={{ maxWidth: 200, maxHeight: 300, objectFit: 'contain' }} />
              <a href={stripDataUrl} download="인생네컷.png"
                className="bg-white text-purple-900 font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform w-full text-center text-sm">
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
