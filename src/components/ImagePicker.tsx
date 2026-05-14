'use client'

import { useRef, useState } from 'react'
import { ImageIcon, X, ScanSearch } from 'lucide-react'
import Image from 'next/image'

interface Props {
  onAnalyze: (file: File) => void
}

export default function ImagePicker({ onAnalyze }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  function handleFile(f: File | undefined) {
    if (!f) return
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setFile(f)
  }

  function clear() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setFile(null)
    if (uploadRef.current) uploadRef.current.value = ''
  }

  if (preview && file) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="relative w-full rounded-3xl overflow-hidden border-2 border-gray-200 shadow-md bg-gray-50">
          <Image
            src={preview}
            alt="Επιλεγμένη εικόνα"
            width={600}
            height={400}
            className="w-full object-contain max-h-72"
            unoptimized
          />
          <button
            onClick={clear}
            className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-100 transition-colors"
            aria-label="Αφαίρεση εικόνας"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <button
          onClick={() => onAnalyze(file)}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xl font-bold py-5 rounded-2xl transition-colors shadow-lg shadow-blue-200"
        >
          <ScanSearch size={26} />
          Έλεγχος μηνύματος
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        onClick={() => uploadRef.current?.click()}
        className="w-full flex flex-col items-center gap-4 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 rounded-3xl py-10 px-6 transition-colors shadow-sm group"
      >
        <div className="w-20 h-20 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
          <ImageIcon size={38} className="text-blue-600" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-700">Φωτογράφισε το ύποπτο μήνυμα</p>
          <p className="text-gray-400 text-sm mt-1">ή επέλεξε εικόνα από τη γκαλερί σου</p>
        </div>
      </button>
    </>
  )
}
