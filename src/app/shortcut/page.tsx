import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Εγκατάσταση Shortcut iOS — Πριν Πατήσεις',
}

const APP_URL = 'https://prin-patiseis.vercel.app'

const STEPS = [
  {
    num: 1,
    title: 'Άνοιξε την εφαρμογή Συντομεύσεις',
    desc: 'Βρες την εφαρμογή «Συντομεύσεις» στο κινητό σου (είναι προεγκατεστημένη στο iPhone).',
    icon: '📱',
  },
  {
    num: 2,
    title: 'Πάτα το «+» πάνω δεξιά',
    desc: 'Για να δημιουργήσεις νέα συντόμευση.',
    icon: '➕',
  },
  {
    num: 3,
    title: 'Πρόσθεσε ενέργεια: «Λήψη από πρόχειρο»',
    desc: 'Πάτα «Προσθήκη ενέργειας», αναζήτησε «Πρόχειρο» και επέλεξε «Λήψη από πρόχειρο».',
    icon: '📋',
  },
  {
    num: 4,
    title: 'Πρόσθεσε ενέργεια: «Άνοιγμα URL»',
    desc: 'Πάτα ξανά «Προσθήκη ενέργειας», αναζήτησε «URL» και επέλεξε «Άνοιγμα URL».',
    icon: '🔗',
  },
  {
    num: 5,
    title: 'Βάλε αυτό το URL',
    desc: 'Στο πεδίο URL πάτα «Πρόχειρο» για να χρησιμοποιήσεις το κείμενο που αντέγραψες.',
    url: `${APP_URL}/?text=`,
    icon: '✏️',
  },
  {
    num: 6,
    title: 'Δώσε όνομα στη συντόμευση',
    desc: 'Πάτα πάνω «Νέα Συντόμευση» και γράψε «Πριν Πατήσεις».',
    icon: '🏷️',
  },
]

export default function ShortcutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center pt-2">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200">
            <ShieldCheck size={40} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shortcut για iPhone</h1>
            <p className="text-gray-500 text-base leading-snug max-w-xs mt-2">
              Στείλε οποιοδήποτε μήνυμα στην εφαρμογή με ένα tap, απευθείας από το clipboard σου.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 flex gap-3 items-start">
          <span className="text-2xl shrink-0">💡</span>
          <p className="text-blue-800 text-sm leading-snug">
            <strong>Πώς θα το χρησιμοποιείς:</strong> Αντέγραψε το κείμενο του ύποπτου μηνύματος → Πάτα τη συντόμευση → Η εφαρμογή ανοίγει και αναλύει αυτόματα.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <div key={step.num} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{step.num}</span>
                </div>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <div className="flex flex-col gap-1 pt-0.5">
                <p className="font-bold text-gray-900 text-base leading-snug">{step.title}</p>
                <p className="text-gray-500 text-sm leading-snug">{step.desc}</p>
                {step.url && (
                  <div className="mt-2 bg-gray-100 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Αντέγραψε αυτό το URL:</p>
                    <p className="font-mono text-xs text-blue-700 break-all select-all">{step.url}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 flex gap-3 items-start">
          <span className="text-2xl shrink-0">💬</span>
          <div className="text-amber-800 text-sm leading-snug">
            <strong>Αντί για συντόμευση:</strong> Μπορείς απλά να αντιγράψεις το κείμενο και να ανοίξεις κατευθείαν{' '}
            <span className="font-mono text-xs break-all">{APP_URL}</span>{' '}
            — χρησιμοποίησε το πλαίσιο «Πληκτρολόγησε το μήνυμα».
          </div>
        </div>

        {/* Back */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-blue-600 font-semibold py-4 rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50 transition-colors"
        >
          <ArrowLeft size={20} />
          Πίσω στην εφαρμογή
        </Link>
      </div>
    </main>
  )
}
