'use client'

import { useState, useCallback, useEffect } from 'react'
import ImagePicker from '@/components/ImagePicker'
import ResultCard from '@/components/ResultCard'
import { runOcr } from '@/lib/ocr'
import { analyzeText } from '@/lib/scamEngine'
import { loadConfig } from '@/lib/configLoader'
import { ScamResult } from '@/types/scam'
import { ShieldCheck, PenLine, Smartphone } from 'lucide-react'
import Link from 'next/link'

type Stage = 'idle' | 'ocr' | 'manual' | 'done' | 'error'

export default function Home() {
  const [stage, setStage] = useState<Stage>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [result, setResult] = useState<ScamResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [manualText, setManualText] = useState('')

  const handleAnalyze = useCallback(async (file: File) => {
    setStage('ocr')
    setOcrProgress(0)
    setErrorMsg(null)

    try {
      const [{ text }, config] = await Promise.all([
        runOcr(file, (pct) => setOcrProgress(pct)),
        loadConfig(),
      ])

      if (text.length < 10) {
        setErrorMsg(
          'Δεν μπόρεσα να διαβάσω κείμενο από αυτή την εικόνα. Δοκίμασε με καλύτερο φωτισμό ή πιο ευκρινή εικόνα.'
        )
        setStage('error')
        return
      }

      setResult(analyzeText(text, config))
      setStage('done')
    } catch {
      setErrorMsg('Κάτι πήγε στραβά κατά την ανάγνωση της εικόνας. Δοκίμασε ξανά.')
      setStage('error')
    }
  }, [])

  async function handleManualSubmit() {
    const trimmed = manualText.trim()
    if (trimmed.length < 5) return
    const config = await loadConfig()
    setResult(analyzeText(trimmed, config))
    setStage('done')
  }

  // Handle incoming ?text= from PWA share target or iOS shortcut
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedText = params.get('text') || params.get('url')
    if (sharedText && sharedText.trim().length >= 5) {
      const trimmed = sharedText.trim()
      loadConfig().then((config) => {
        setResult(analyzeText(trimmed, config))
        setStage('done')
      })
    }
  }, [])

  function reset() {
    setStage('idle')
    setResult(null)
    setOcrProgress(0)
    setErrorMsg(null)
    setManualText('')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center pt-2">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200">
            <ShieldCheck size={40} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Πριν Πατήσεις</h1>
            <p className="text-gray-500 text-base leading-snug max-w-xs mt-2">
              Έλεγξε αν ένα μήνυμα είναι ύποπτο πριν πατήσεις link ή δώσεις στοιχεία.
            </p>
          </div>
        </div>

        {stage === 'idle' && (
          <div className="flex flex-col gap-4">
            <ImagePicker onAnalyze={handleAnalyze} />

            <button
              onClick={() => setStage('manual')}
              className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-base py-3 rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50 transition-colors"
            >
              <PenLine size={20} />
              Πληκτρολόγησε το μήνυμα
            </button>

            <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <span className="text-xl">🔒</span>
              <p className="text-sm text-gray-500 leading-snug">
                Δεν διαβάζουμε τα SMS σου. Ελέγχεις μόνο την εικόνα που επιλέγεις.
              </p>
            </div>

            <Link
              href="/shortcut"
              className="flex items-center justify-center gap-2 text-gray-400 hover:text-blue-600 font-medium text-sm transition-colors py-1"
            >
              <Smartphone size={16} />
              Πώς να το προσθέσεις στην αρχική οθόνη
            </Link>
          </div>
        )}

        {stage === 'ocr' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-6 py-10 px-6">
            <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-gray-800 font-bold text-xl">
                {ocrProgress < 30 ? 'Φορτώνω…' : 'Διαβάζω το μήνυμα…'}
              </p>
              <p className="text-gray-400 text-sm mt-1">{ocrProgress}% ολοκληρώθηκε</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-amber-800 font-semibold text-base leading-snug">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xl py-5 rounded-2xl transition-colors shadow-lg shadow-blue-200"
            >
              Δοκίμασε ξανά
            </button>
            <button
              onClick={() => setStage('manual')}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-semibold py-4 rounded-2xl transition-colors"
            >
              <PenLine size={20} />
              Πληκτρολόγησε το μήνυμα
            </button>
          </div>
        )}

        {stage === 'manual' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-5 p-5">
            <div className="text-center">
              <p className="text-gray-800 font-bold text-lg">Πληκτρολόγησε το μήνυμα</p>
              <p className="text-gray-400 text-sm mt-1">Γράψε ή κάνε paste το κείμενο παρακάτω</p>
            </div>
            <textarea
              className="w-full border-2 border-gray-200 focus:border-blue-400 focus:outline-none rounded-2xl p-4 text-base text-gray-800 resize-none min-h-[140px] bg-gray-50 transition-colors"
              placeholder="π.χ. «Ο λογαριασμός σας έχει αποκλειστεί. Πατήστε εδώ για επαλήθευση…»"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              disabled={manualText.trim().length < 5}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 active:bg-blue-800 text-white font-bold text-xl py-5 rounded-2xl transition-colors shadow-lg shadow-blue-100"
            >
              🔍 Έλεγχος
            </button>
            <button
              onClick={reset}
              className="text-sm text-gray-400 hover:text-gray-600 text-center transition-colors"
            >
              ← Πίσω
            </button>
          </div>
        )}

        {stage === 'done' && result && (
          <ResultCard result={result} onReset={reset} />
        )}

        <footer className="text-center text-xs text-gray-400 leading-snug">
          Η εφαρμογή δίνει ενδείξεις κινδύνου, όχι απόλυτη βεβαιότητα.
        </footer>
      </div>
    </main>
  )
}
