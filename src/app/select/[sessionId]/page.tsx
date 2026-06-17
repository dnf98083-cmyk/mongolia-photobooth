'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { uploadStripToCloud } from '@/lib/cloudStorage'

const STRIP_W = 420
const PHOTO_W = 380
const PHOTO_H = 285
const GAP = 15
const PAD_TOP = 30
const PAD_SIDE = 20
const BOTTOM_H = 90
const STRIP_H = PAD_TOP + (PHOTO_H + GAP) * 4 - GAP + BOTTOM_H

const REQUIRED = 4

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

  useEffect(() => {
    fetch('/api/local-ip').then(r => r.json()).then(d => setLocalIP(d.ip))
  }, [])

  // 서버에서 세션 정보 가져와서 사진 로드
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(session => {
        const count: number = session.photoCount ?? 0
        const urls = Array.from({ length: count }, (_, i) =>
          `/api/files/${sessionId}/photo_${i}.jpg`
        )
        setPhotos(urls)
      })
  }, [sessionId])

  // 사진 선택/해제 토글
  function toggleSelect(i: number) {
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i)
      if (prev.length >= REQUIRED) return prev
      return [...prev, i]
    })
  }

  // 선택된 4장으로 스트립 합성
  const buildStrip = useCallback(async () => {
    const canvas = canvasRef.current!
    canvas.width = STRIP_W
    canvas.height = STRIP_H
    const ctx = canvas.getContext('2d')!

    // 배경 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, STRIP_H)
    grad.addColorStop(0, '#f8f0ff')
    grad.addColorStop(1, '#fff0f5')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, STRIP_W, STRIP_H)

    // 각 사진 그리기
    for (let pos = 0; pos < REQUIRED; pos++) {
      const photoIdx = selected[pos]
      const url = photos[photoIdx]
      const y = PAD_TOP + pos * (PHOTO_H + GAP)

      await new Promise<void>(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // 가득 채우기 (object-cover 방식)
          const scale = Math.max(PHOTO_W / img.width, PHOTO_H / img.height)
          const sw = PHOTO_W / scale
          const sh = PHOTO_H / scale
          const sx = (img.width - sw) / 2
          const sy = (img.height - sh) / 2
          ctx.drawImage(img, sx, sy, sw, sh, PAD_SIDE, y, PHOTO_W, PHOTO_H)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = url
      })
    }

    // 하단 텍스트
    const textY = STRIP_H - BOTTOM_H + 30
    ctx.fillStyle = '#9333ea'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('자양교회 몽골 선교', STRIP_W / 2, textY)
    ctx.fillStyle = '#d946ef'
    ctx.font = '14px sans-serif'
    ctx.fillText(new Date().toLocaleDateString('ko-KR'), STRIP_W / 2, textY + 24)
    ctx.fillText('인생네컷', STRIP_W / 2, textY + 44)

    return canvas.toDataURL('image/png')
  }, [selected, photos])

  // 선택 완료 → 스트립 저장 → QR 생성
  async function confirmSelection() {
    if (selected.length !== REQUIRED) return
    setSaving(true)

    const dataUrl = await buildStrip()
    setStripUrl(dataUrl)

    // 로컬 서버에 항상 저장
    await fetch(`/api/sessions/${sessionId}/strip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataUrl }),
    })

    // 클라우드 업로드 시도 (5초 타임아웃) → 성공하면 공개 URL, 실패하면 핫스팟 URL
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 10000))
    const cloudUrl = await Promise.race([uploadStripToCloud(sessionId, dataUrl), timeout])
    const ip = localIP || '192.168.137.1'
    if (cloudUrl) {
      setIsCloudMode(true)
      setQrUrl(cloudUrl)
      setSaving(false)
      return
    }

    // 오프라인 또는 업로드 실패 → 핫스팟 URL
    setIsCloudMode(false)
    setQrUrl(`https://${ip}:3000/download/${sessionId}`)
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 p-4">
      <canvas ref={canvasRef} className="hidden" />

      {!qrUrl ? (
        <>
          <h1 className="text-white text-2xl font-black text-center mb-2 mt-2">사진 4장 고르기</h1>
          <p className="text-pink-200 text-center text-sm mb-4">
            {selected.length} / {REQUIRED} 선택됨
          </p>

          <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
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

          <div className="flex justify-center mt-6">
            <button
              onClick={confirmSelection}
              disabled={selected.length !== REQUIRED || saving}
              className="bg-white text-purple-900 font-extrabold text-xl px-10 py-4 rounded-full shadow-xl disabled:opacity-40 hover:scale-105 transition-transform"
            >
              {saving ? '스트립 만드는 중...' : `선택 완료 (${selected.length}/${REQUIRED})`}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-4 w-full px-4">
          {/* 헤더 */}
          <div className="text-center">
            <p className="text-pink-200 text-xs tracking-widest mb-1">자양교회 몽골 선교</p>
            <h1 className="text-white text-3xl font-black">완성!</h1>
          </div>

          {/* 온라인/오프라인 배지 */}
          <div className={`px-5 py-2 rounded-full text-sm font-bold shadow-lg ${isCloudMode ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`}>
            {isCloudMode ? '🌐 온라인 — 어디서든 스캔 가능' : '📡 오프라인 — 핫스팟 연결 후 스캔'}
          </div>

          {/* 메인 컨텐츠 — 태블릿은 가로, 폰은 세로 */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center md:items-start w-full max-w-3xl">

            {/* 스트립 미리보기 + 다운로드 버튼 */}
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

            {/* QR 코드 */}
            <div className="bg-white rounded-3xl p-5 flex flex-col items-center gap-3 shadow-2xl">
              <p className="text-gray-700 text-sm font-bold">📱 폰으로 QR 스캔</p>
              <QRCodeDisplay url={qrUrl} size={220} />
              <p className="text-gray-500 text-xs text-center leading-relaxed">
                {isCloudMode
                  ? '인터넷만 있으면 어디서든 스캔 가능'
                  : '노트북 핫스팟 연결 후 스캔'}
                <br />스캔하면 사진 저장 가능
              </p>
              <p className="text-gray-400 text-[10px] text-center break-all max-w-[220px]">{qrUrl}</p>
            </div>
          </div>

          <a
            href="/"
            className="bg-white/20 text-white font-bold px-8 py-3 rounded-full hover:bg-white/30 transition-colors text-sm mt-2"
          >
            처음으로 돌아가기
          </a>
        </div>
      )}
    </main>
  )
}
