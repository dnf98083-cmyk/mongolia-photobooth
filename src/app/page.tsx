'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCodeDisplay from '@/components/QRCodeDisplay'

export default function Home() {
  const router = useRouter()
  const [localIP, setLocalIP] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVercel, setIsVercel] = useState(false)

  useEffect(() => {
    if (window.location.hostname.includes('vercel.app')) {
      setIsVercel(true)
      return
    }
    fetch('/api/local-ip')
      .then(r => r.json())
      .then(d => setLocalIP(d.ip))
  }, [])

  async function startSession() {
    setLoading(true)
    const res = await fetch('/api/sessions', { method: 'POST' })
    const { sessionId } = await res.json()
    router.push(`/booth/${sessionId}`)
  }

  const serverUrl = localIP ? `https://${localIP}:3000` : ''

  if (isVercel) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex flex-col items-center justify-center p-6 gap-6 text-center">
        <div className="text-white">
          <p className="text-pink-200 text-sm tracking-widest mb-2">자양교회 몽골 선교</p>
          <h1 className="text-5xl font-black drop-shadow-lg">인생네컷</h1>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 max-w-sm">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-white font-bold text-lg mb-2">촬영은 노트북에서!</p>
          <p className="text-pink-200 text-sm leading-relaxed">
            이 페이지는 사진 다운로드 전용입니다.<br />
            촬영하려면 노트북의 핫스팟에 연결 후<br />
            QR코드를 스캔하세요.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center text-white">
        <p className="text-base md:text-lg font-medium tracking-widest text-pink-200 mb-2">자양교회 몽골 선교</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-lg">인생네컷</h1>
        <p className="mt-3 text-pink-100 text-sm md:text-base">4컷 사진 + 영상을 QR코드로 받아가세요</p>
      </div>

      <button
        onClick={startSession}
        disabled={loading}
        className="bg-white text-purple-900 font-extrabold text-2xl md:text-3xl px-14 md:px-20 py-5 md:py-6 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
      >
        {loading ? '준비 중...' : '촬영 시작'}
      </button>

      {serverUrl && (
        <div className="bg-white/10 backdrop-blur rounded-3xl p-6 flex flex-col items-center gap-3">
          <p className="text-white font-semibold text-sm">이 QR로 앱 접속 가능</p>
          <QRCodeDisplay url={serverUrl} size={160} />
          <p className="text-pink-200 text-xs font-mono">{serverUrl}</p>
          <p className="text-pink-200 text-xs text-center">핫스팟 연결 후 스캔하세요</p>
        </div>
      )}
    </main>
  )
}
