'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
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
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-gray-200 shadow">
          <Image
            src={preview}
            alt="Επιλεγμένη εικόνα"
            width={600}
            height={400}
            className="w-full object-contain bg-gray-50 max-h-72"
            unoptimized
          />
          <button
            onClick={clear}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-gray-200"
            aria-label="Αφαίρεση εικόνας"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <button
          onClick={() => onAnalyze(file)}
          className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold py-4 rounded-2xl transition-colors shadow"
        >
          🔍 Έλεγχος
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Hidden file input — on mobile opens native picker (camera + gallery) */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        onClick={() => uploadRef.current?.click()}
        className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-blue-50 text-xl font-semibold py-5 rounded-2xl transition-colors shadow w-full"
      >
        <Upload size={26} />
        Ανέβασε screenshot ή φωτογράφισε
      </button>
    </>
  )
}
