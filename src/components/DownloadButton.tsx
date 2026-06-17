'use client'

export default function DownloadButton({ url }: { url: string }) {
  async function handleDownload() {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = '인생네컷.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="w-full bg-white text-purple-900 font-extrabold text-lg text-center px-6 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
    >
      📥 사진 저장하기
    </button>
  )
}
