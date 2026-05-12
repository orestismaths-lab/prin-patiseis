'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, Upload, X, ZoomIn } from 'lucide-react'
import Image from 'next/image'

interface Props {
  onAnalyze: (file: File) => void
}

// ── Webcam modal (desktop) ────────────────────────────────────────────────────

interface WebcamProps {
  onCapture: (file: File) => void
  onClose: () => void
}

function WebcamModal({ onCapture, onClose }: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      } catch {
        setError('Δεν επιτράπηκε η πρόσβαση στην κάμερα. Έλεγξε τα δικαιώματα στον browser.')
      }
    }
    start()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      onCapture(file)
    }, 'image/jpeg', 0.92)
  }, [onCapture])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Φωτογράφισε το μήνυμα</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <p className="text-white text-sm text-center px-6">{error}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl"
          >
            Ακύρωση
          </button>
          <button
            onClick={capture}
            disabled={!ready || !!error}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <ZoomIn size={20} />
            Λήψη
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImagePicker({ onAnalyze }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)

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
      {showWebcam && (
        <WebcamModal
          onCapture={(f) => { setShowWebcam(false); handleFile(f) }}
          onClose={() => setShowWebcam(false)}
        />
      )}

      <div className="flex flex-col gap-4 w-full">
        {/* Hidden upload input */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Upload button */}
        <button
          onClick={() => uploadRef.current?.click()}
          className="flex items-center justify-center gap-3 bg-white border-2 border-blue-200 hover:border-blue-400 text-blue-700 text-xl font-semibold py-5 rounded-2xl transition-colors shadow-sm"
        >
          <Upload size={26} />
          Ανέβασε screenshot
        </button>

        {/* Camera button */}
        <button
          onClick={() => setShowWebcam(true)}
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold py-5 rounded-2xl transition-colors shadow"
        >
          <Camera size={26} />
          Φωτογράφισε μήνυμα
        </button>
      </div>
    </>
  )
}
