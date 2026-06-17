import { getSessionData } from '@/lib/storage'
import DownloadButton from '@/components/DownloadButton'

interface Props {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ cloudUrl?: string }>
}

export default async function DownloadPage({ params, searchParams }: Props) {
  const { sessionId } = await params
  const { cloudUrl } = await searchParams

  let session = null
  try { session = getSessionData(sessionId) } catch {}

  const stripSrc = cloudUrl || (session?.stripFile ? `/api/files/${sessionId}/strip.png` : null)
  const hasVideo = !!session?.videoFile

  if (!stripSrc && !session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex items-center justify-center p-6">
        <div className="bg-white/10 rounded-3xl p-8 text-center">
          <p className="text-white text-xl font-bold">세션을 찾을 수 없습니다</p>
          <p className="text-pink-200 text-sm mt-2">QR코드를 다시 스캔해주세요</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-700 flex flex-col items-center p-5 gap-5">

      {/* 헤더 */}
      <div className="text-center pt-4">
        <p className="text-pink-200 text-xs tracking-widest">자양교회 몽골 선교</p>
        <h1 className="text-white text-4xl font-black mt-1">인생네컷</h1>
        <p className="text-pink-100 text-sm mt-1">사진을 저장하세요</p>
      </div>

      {/* 스트립 미리보기 */}
      {stripSrc && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <img
            src={stripSrc}
            alt="내 인생네컷"
            className="rounded-2xl shadow-2xl border-4 border-white/20 w-full"
          />

          {/* 사진 다운로드 버튼 */}
          <DownloadButton url={stripSrc} />
        </div>
      )}

      {/* 영상 다운로드 (로컬 모드에서만) */}
      {hasVideo && !cloudUrl && (
        <a
          href={`/api/files/${sessionId}/video.webm`}
          download="인생네컷_영상.webm"
          className="w-full max-w-xs bg-pink-500 text-white font-extrabold text-lg text-center px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
        >
          🎬 영상 저장하기
        </a>
      )}

      {/* 날짜 */}
      {session && (
        <p className="text-pink-200 text-xs text-center">
          촬영 날짜: {new Date(session.createdAt).toLocaleDateString('ko-KR')}
        </p>
      )}

    </main>
  )
}
