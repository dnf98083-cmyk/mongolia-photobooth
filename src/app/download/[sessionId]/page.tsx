import { getSessionData } from '@/lib/storage'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function DownloadPage({ params }: Props) {
  const { sessionId } = await params
  const session = getSessionData(sessionId)

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <p className="text-white text-center">세션을 찾을 수 없습니다.</p>
      </main>
    )
  }

  const hasStrip = !!session.stripFile
  const hasVideo = !!session.videoFile

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex flex-col items-center p-6 gap-6">
      <div className="text-center text-white pt-6">
        <p className="text-pink-200 text-sm tracking-widest">자양교회 몽골 선교</p>
        <h1 className="text-4xl font-black mt-1">인생네컷</h1>
        <p className="text-pink-100 text-sm mt-2">사진과 영상을 다운로드하세요</p>
      </div>

      {/* 스트립 미리보기 */}
      {hasStrip && (
        <img
          src={`/api/files/${sessionId}/strip.png`}
          alt="내 인생네컷"
          className="rounded-2xl shadow-2xl max-w-xs w-full"
        />
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {hasStrip ? (
          <a
            href={`/api/files/${sessionId}/strip.png`}
            download="인생네컷.png"
            className="bg-white text-purple-900 font-extrabold text-lg text-center px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
          >
            📷 스트립 사진 다운로드
          </a>
        ) : (
          <div className="bg-white/20 text-white/60 text-center px-6 py-4 rounded-2xl">
            스트립 사진 준비 중...
          </div>
        )}

        {hasVideo ? (
          <a
            href={`/api/files/${sessionId}/video.webm`}
            download="인생네컷_영상.webm"
            className="bg-pink-500 text-white font-extrabold text-lg text-center px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
          >
            🎬 영상 다운로드
          </a>
        ) : (
          <div className="bg-white/20 text-white/60 text-center px-6 py-4 rounded-2xl">
            영상 준비 중...
          </div>
        )}
      </div>

      <p className="text-pink-200 text-xs text-center mt-4">
        촬영 날짜: {new Date(session.createdAt).toLocaleDateString('ko-KR')}
      </p>
    </main>
  )
}
