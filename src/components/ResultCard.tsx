'use client'

import { useState } from 'react'
import { ScamResult } from '@/types/scam'
import { RotateCcw, Copy, Check, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'

interface Props {
  result: ScamResult
  onReset: () => void
}

const LEVEL_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: 'Χαμηλός κίνδυνος',
    bg: 'bg-green-50',
    border: 'border-green-300',
    iconColor: 'text-green-600',
    labelColor: 'text-green-800',
    recommendation:
      'Δεν βρέθηκαν ισχυρά σημάδια απάτης, αλλά συνέχισε προσεκτικά.',
    actions: [
      'Επαλήθευσε τον αποστολέα από την επίσημη πηγή.',
      'Αν αμφιβάλλεις, κλείσε το μήνυμα και άνοιξε την επίσημη εφαρμογή.',
    ],
  },
  suspicious: {
    icon: AlertTriangle,
    label: 'Ύποπτο',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    iconColor: 'text-amber-500',
    labelColor: 'text-amber-800',
    recommendation:
      'Έλεγξε το μήνυμα από την επίσημη εφαρμογή ή το επίσημο site πριν κάνεις οτιδήποτε.',
    actions: [
      'Μην πατήσεις links μέσα στο μήνυμα.',
      'Μπες στο επίσημο site ή την εφαρμογή απευθείας.',
      'Αν το μήνυμα ζητά στοιχεία, επικοινώνησε τηλεφωνικά με τον αποστολέα.',
    ],
  },
  dangerous: {
    icon: ShieldAlert,
    label: 'Επικίνδυνο',
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconColor: 'text-red-600',
    labelColor: 'text-red-800',
    recommendation: 'Μην πατήσεις το link και μη δώσεις στοιχεία.',
    actions: [
      'Διέγραψε το μήνυμα.',
      'Μην απαντήσεις, μην καλέσεις ξανά αν κάλεσαν.',
      'Αν έδωσες ήδη στοιχεία, επικοινώνησε αμέσως με την τράπεζά σου.',
      'Μπορείς να αναφέρεις την απάτη στη Δίωξη Ηλεκτρονικού Εγκλήματος (11188).',
    ],
  },
}

export default function ResultCard({ result, onReset }: Props) {
  const [copied, setCopied] = useState(false)

  const config = LEVEL_CONFIG[result.riskLevel]
  const Icon = config.icon

  function buildCopyText(): string {
    const lines = [
      `Αποτέλεσμα: ${config.label}`,
      `Σκορ: ${result.totalScore}/100`,
      '',
      `Σύσταση: ${config.recommendation}`,
    ]
    if (result.signals.length > 0) {
      lines.push('', 'Σήματα κινδύνου:')
      result.signals.forEach((s) => lines.push(`• ${s.label}`))
    }
    if (result.detectedDomains.length > 0) {
      lines.push('', `Domains: ${result.detectedDomains.join(', ')}`)
    }
    lines.push('', 'Ελέγχθηκε με την εφαρμογή "Πριν Πατήσεις"')
    return lines.join('\n')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCopyText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`w-full rounded-2xl border-2 ${config.bg} ${config.border} p-5 flex flex-col gap-4 shadow`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon size={36} className={config.iconColor} />
        <div>
          <div className={`text-2xl font-bold ${config.labelColor}`}>{config.label}</div>
          <div className="text-sm text-gray-500">Σκορ κινδύνου: {result.totalScore} / 100</div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="text-base font-semibold text-gray-800 leading-snug">
        {config.recommendation}
      </div>

      {/* Signals */}
      {result.signals.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Τι εντοπίστηκε
          </div>
          <ul className="flex flex-col gap-1">
            {result.signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-gray-400">•</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detected domains */}
      {result.detectedDomains.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Σύνδεσμοι που βρέθηκαν
          </div>
          <div className="flex flex-wrap gap-2">
            {result.detectedDomains.map((d, i) => (
              <span key={i} className="bg-white border border-gray-300 text-xs text-gray-600 px-2 py-1 rounded-lg font-mono">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next actions */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Τι να κάνεις τώρα
        </div>
        <ul className="flex flex-col gap-1">
          {config.actions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="font-bold text-gray-400">{i + 1}.</span>
              {a}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 italic leading-snug">
        Η εφαρμογή δίνει ενδείξεις κινδύνου, όχι απόλυτη βεβαιότητα.
      </p>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
        >
          <RotateCcw size={18} />
          Νέος έλεγχος
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
        >
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          {copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}
        </button>
      </div>
    </div>
  )
}
