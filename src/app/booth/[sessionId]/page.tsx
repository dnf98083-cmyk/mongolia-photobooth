'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

const TOTAL_SHOTS = 6   // 6장 찍고
const COUNTDOWN = 3     // 각 촬영 전 3초 카운트다운

type Phase = 'ready' | 'countdown' | 'flash' | 'done'

export default function BoothPage() {
  const router = useRouter()
  const { sessionId } = useParams<{ sessionId: string }>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('ready')
  const [shotIndex, setShotIndex] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 카메라 초기화
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setError('카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 허용해주세요.'))

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // 사진 한 장 캡처
  const capturePhoto = useCallback((): string => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  // 서버에 사진 업로드
  const uploadPhoto = useCallback(async (index: number, data: string) => {
    await fetch(`/api/sessions/${sessionId}/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIndex: index, data }),
    })
  }, [sessionId])

  // 촬영 시작 버튼
  const startShooting = useCallback(() => {
    if (!streamRef.current) return

    // 영상 녹화 시작
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8' })
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start(1000)
    recorderRef.current = recorder

    setPhase('countdown')
    setShotIndex(0)
    setCountdown(COUNTDOWN)
  }, [])

  // 카운트다운 → 촬영 → 반복 로직
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }

    // 촬영!
    setPhase('flash')
    const dataUrl = capturePhoto()
    const newPhotos = [...photos, dataUrl]
    setPhotos(newPhotos)
    uploadPhoto(shotIndex, dataUrl)

    setTimeout(() => {
      if (shotIndex + 1 < TOTAL_SHOTS) {
        setShotIndex(i => i + 1)
        setCountdown(COUNTDOWN)
        setPhase('countdown')
      } else {
        setPhase('done')
      }
    }, 800)
  }, [phase, countdown, shotIndex, photos, capturePhoto, uploadPhoto])

  // 영상 저장 후 선택 페이지로
  async function finishAndGoSelect() {
    setUploading(true)
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>(resolve => {
        recorder.onstop = () => resolve()
        recorder.stop()
      })
    }

    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    await fetch(`/api/sessions/${sessionId}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'video/webm' },
      body: blob,
    })

    router.push(`/select/${sessionId}`)
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

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* 플래시 효과 */}
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white z-50 animate-ping pointer-events-none" style={{ animationDuration: '0.15s', animationIterationCount: 1 }} />
      )}

      {/* 카메라 프리뷰 */}
      <div className="relative w-full max-w-2xl aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-xl"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* 카운트다운 오버레이 */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-black drop-shadow-2xl animate-pulse"
              style={{ fontSize: '8rem', lineHeight: 1 }}>
              {countdown === 0 ? '📸' : countdown}
            </span>
          </div>
        )}

        {/* 촬영 진행 표시 */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-2">
          {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 border-white transition-all ${i < photos.length ? 'bg-pink-400' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* 하단 UI */}
      <div className="mt-6 flex flex-col items-center gap-4 px-4 w-full max-w-2xl">

        {/* 촬영 전 시작 버튼 */}
        {phase === 'ready' && (
          <button
            onClick={startShooting}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold text-xl px-12 py-4 rounded-full shadow-lg transition-colors"
          >
            촬영 시작 📸
          </button>
        )}

        {/* 촬영 중 안내 */}
        {(phase === 'countdown' || phase === 'flash') && (
          <p className="text-white text-lg font-semibold">
            {shotIndex + 1} / {TOTAL_SHOTS} 번째 촬영 중...
          </p>
        )}

        {/* 완료 후 */}
        {phase === 'done' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-white text-xl font-bold">촬영 완료! 사진을 골라보세요</p>
            <button
              onClick={finishAndGoSelect}
              disabled={uploading}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-xl px-12 py-4 rounded-full shadow-lg transition-colors disabled:opacity-60 w-full"
            >
              {uploading ? '저장 중...' : '사진 고르러 가기 →'}
            </button>
          </div>
        )}

        {/* 찍힌 사진 썸네일 */}
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {photos.map((p, i) => (
              <img key={i} src={p} alt={`shot-${i}`} className="w-20 h-14 object-cover rounded-lg border-2 border-pink-400" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
