import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Προσθήκη στην αρχική οθόνη — Πριν Πατήσεις',
}

export default function ShortcutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-md flex flex-col gap-6">

        <div className="flex flex-col items-center gap-4 text-center pt-2">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200">
            <ShieldCheck size={40} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Προσθήκη στο iPhone</h1>
            <p className="text-gray-500 text-base mt-2">
              Έτσι η εφαρμογή θα είναι πάντα έτοιμη στην αρχική σου οθόνη.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {[
            { num: 1, icon: '🧭', title: 'Άνοιξε το Safari', desc: 'Η εφαρμογή λειτουργεί μόνο μέσω Safari (όχι Chrome ή Firefox).' },
            { num: 2, icon: '📤', title: 'Πάτα το κουμπί κοινοποίησης', desc: 'Είναι το τετράγωνο με το βέλος προς τα πάνω, στο κέντρο κάτω της οθόνης.' },
            { num: 3, icon: '➕', title: 'Επίλεξε «Προσθήκη στην Αρχική Οθόνη»', desc: 'Κύλησε προς τα κάτω στο μενού που εμφανίζεται και πάτα αυτή την επιλογή.' },
          ].map((step) => (
            <div key={step.num} className="flex items-start gap-4 px-5 py-5">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">{step.num}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">{step.icon} {step.title}</p>
                <p className="text-gray-500 text-sm mt-0.5 leading-snug">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

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
