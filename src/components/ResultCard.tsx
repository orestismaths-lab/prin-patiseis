'use client'

import { useState } from 'react'
import { ScamResult } from '@/types/scam'
import { RotateCcw, Share2, Check, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'

interface Props {
  result: ScamResult
  onReset: () => void
}

const LEVEL_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: 'Χαμηλός κίνδυνος',
    headerBg: 'bg-emerald-600',
    headerShadow: 'shadow-emerald-200',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-400',
    scoreBar: 'bg-emerald-500',
    labelColor: 'text-emerald-700',
    recommendation: 'Δεν βρέθηκαν ισχυρά σημάδια απάτης, αλλά συνέχισε προσεκτικά.',
    actions: [
      'Επαλήθευσε τον αποστολέα από την επίσημη πηγή.',
      'Αν αμφιβάλλεις, κλείσε το μήνυμα και άνοιξε την επίσημη εφαρμογή.',
    ],
  },
  suspicious: {
    icon: AlertTriangle,
    label: 'Ύποπτο μήνυμα',
    headerBg: 'bg-amber-500',
    headerShadow: 'shadow-amber-200',
    border: 'border-amber-200',
    dotColor: 'bg-amber-400',
    scoreBar: 'bg-amber-400',
    labelColor: 'text-amber-700',
    recommendation: 'Έλεγξε από την επίσημη εφαρμογή ή site πριν κάνεις οτιδήποτε.',
    actions: [
      'Μην πατήσεις links μέσα στο μήνυμα.',
      'Μπες στο επίσημο site ή την εφαρμογή απευθείας.',
      'Αν ζητά στοιχεία, επικοινώνησε τηλεφωνικά με τον αποστολέα.',
    ],
  },
  dangerous: {
    icon: ShieldAlert,
    label: 'Επικίνδυνο!',
    headerBg: 'bg-red-600',
    headerShadow: 'shadow-red-200',
    border: 'border-red-200',
    dotColor: 'bg-red-500',
    scoreBar: 'bg-red-500',
    labelColor: 'text-red-700',
    recommendation: 'Μην πατήσεις κανένα link και μη δώσεις στοιχεία.',
    actions: [
      'Διέγραψε το μήνυμα αμέσως.',
      'Μην απαντήσεις, μην καλέσεις ξανά αν κάλεσαν.',
      'Αν έδωσες ήδη στοιχεία, επικοινώνησε αμέσως με την τράπεζά σου.',
      'Μπορείς να αναφέρεις την απάτη στη Δίωξη Ηλεκτρονικού Εγκλήματος: 11188.',
    ],
  },
}

export default function ResultCard({ result, onReset }: Props) {
  const [shared, setShared] = useState(false)

  const cfg = LEVEL_CONFIG[result.riskLevel]
  const Icon = cfg.icon

  function buildShareText(): string {
    const lines = [
      `Αποτέλεσμα: ${cfg.label} (${result.totalScore}/100)`,
      '',
      `Σύσταση: ${cfg.recommendation}`,
    ]
    if (result.signals.length > 0) {
      lines.push('', 'Τι εντοπίστηκε:')
      result.signals.forEach((s) => {
        lines.push(`• ${s.label}${s.detail ? ` — ${s.detail}` : ''}`)
      })
    }
    lines.push('', 'Ελέγχθηκε με την εφαρμογή "Πριν Πατήσεις"')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Πριν Πατήσεις — Αποτέλεσμα', text })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    <div className={`w-full rounded-3xl border-2 ${cfg.border} bg-white shadow-xl overflow-hidden`}>

      {/* Coloured header band */}
      <div className={`${cfg.headerBg} px-6 py-5 flex items-center gap-4 shadow-lg ${cfg.headerShadow}`}>
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Icon size={32} className="text-white" strokeWidth={2} />
        </div>
        <div className="text-white">
          <div className="text-2xl font-bold leading-tight">{cfg.label}</div>
          <div className="text-white/80 text-sm mt-0.5">Σκορ κινδύνου: {result.totalScore} / 100</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-6 pt-5">
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`${cfg.scoreBar} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${result.totalScore}%` }}
          />
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">

        {/* Recommendation */}
        <div className={`text-base font-semibold ${cfg.labelColor} leading-snug`}>
          {cfg.recommendation}
        </div>

        {/* Signals */}
        {result.signals.length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Τι εντοπίστηκε
            </div>
            <ul className="flex flex-col gap-3">
              {result.signals.map((s, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotColor}`} />
                    <span className="text-base font-medium text-gray-800 leading-snug">{s.label}</span>
                  </div>
                  {s.detail && (
                    <div className="ml-5 text-xs text-gray-400 font-mono break-all leading-relaxed">{s.detail}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detected domains */}
        {result.detectedDomains.length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Σύνδεσμοι που βρέθηκαν
            </div>
            <div className="flex flex-wrap gap-2">
              {result.detectedDomains.map((d, i) => (
                <span key={i} className="bg-gray-100 text-sm text-gray-600 px-3 py-1 rounded-xl font-mono">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Τι να κάνεις τώρα
          </div>
          <ul className="flex flex-col gap-2.5">
            {cfg.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                </div>
                <span className="text-base text-gray-700 leading-snug">{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 italic text-center leading-snug">
          Η εφαρμογή δίνει ενδείξεις κινδύνου, όχι απόλυτη βεβαιότητα.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold py-4 rounded-2xl transition-colors text-base"
          >
            <RotateCcw size={18} />
            Νέος έλεγχος
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-md shadow-blue-200"
          >
            {shared ? <Check size={18} /> : <Share2 size={18} />}
            {shared ? 'Αντιγράφηκε' : 'Μοιράσου'}
          </button>
        </div>
      </div>
    </div>
  )
}
