'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  url: string
  size?: number
  label?: string
}

export default function QRCodeDisplay({ url, size = 200, label }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    }).then(setDataUrl)
  }, [url, size])

  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg animate-pulse" />

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={dataUrl} alt="QR Code" className="rounded-lg shadow-md" />
      {label && <p className="text-sm text-gray-500 text-center">{label}</p>}
    </div>
  )
}
