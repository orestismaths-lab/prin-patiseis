'use client'

import { useState, useCallback } from 'react'
import ImagePicker from '@/components/ImagePicker'
import ResultCard from '@/components/ResultCard'
import { runOcr } from '@/lib/ocr'
import { analyzeText } from '@/lib/scamEngine'
import { ScamResult } from '@/types/scam'
import { ShieldCheck } from 'lucide-react'

type Stage = 'idle' | 'ocr' | 'done' | 'error'

export default function Home() {
  const [stage, setStage] = useState<Stage>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [result, setResult] = useState<ScamResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAnalyze = useCallback(async (file: File) => {
    setStage('ocr')
    setOcrProgress(0)
    setErrorMsg(null)

    try {
      const { text } = await runOcr(file, (pct) => setOcrProgress(pct))

      if (text.length < 10) {
        setErrorMsg(
          'Δεν μπόρεσα να διαβάσω κείμενο από αυτή την εικόνα. Δοκίμασε με καλύτερο φωτισμό ή πιο ευκρινή εικόνα.'
        )
        setStage('error')
        return
      }

      const analysisResult = analyzeText(text)
      setResult(analysisResult)
      setStage('done')
    } catch {
      setErrorMsg('Κάτι πήγε στραβά κατά την ανάγνωση της εικόνας. Δοκίμασε ξανά.')
      setStage('error')
    }
  }, [])

  function reset() {
    setStage('idle')
    setResult(null)
    setOcrProgress(0)
    setErrorMsg(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <ShieldCheck size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Πριν Πατήσεις</h1>
          </div>
          <p className="text-gray-500 text-base leading-snug max-w-xs">
            Έλεγξε αν ένα μήνυμα είναι ύποπτο πριν πατήσεις link ή δώσεις στοιχεία.
          </p>
        </div>

        {/* Main content */}
        {stage === 'idle' && (
          <>
            <ImagePicker onAnalyze={handleAnalyze} />
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700 leading-snug text-center">
              🔒 Δεν διαβάζουμε τα SMS σου. Ελέγχεις μόνο την εικόνα που επιλέγεις.
            </div>
          </>
        )}

        {stage === 'ocr' && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-gray-700 font-semibold text-lg">Διαβάζω το μήνυμα…</p>
              <p className="text-gray-400 text-sm mt-1">{ocrProgress}% ολοκληρώθηκε</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-amber-800 font-semibold text-base">⚠️ {errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-4 px-8 rounded-2xl transition-colors"
            >
              Δοκίμασε ξανά
            </button>
          </div>
        )}

        {stage === 'done' && result && (
          <ResultCard result={result} onReset={reset} />
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pb-4 leading-snug">
          Η εφαρμογή δίνει ενδείξεις κινδύνου, όχι απόλυτη βεβαιότητα.
        </footer>
      </div>
    </main>
  )
}
