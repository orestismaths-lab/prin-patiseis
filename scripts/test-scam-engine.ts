// Local test runner — loads scam-message-dataset.json and runs all cases
// through the real scam engine (src/lib/scamEngine.ts).
// Run with: npm run test:scam

import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzeText } from '@/lib/scamEngine'

interface DatasetCase {
  id: string
  category: string
  expectedRisk: 'low' | 'suspicious' | 'dangerous'
  message: string
  notes?: string
}

interface Dataset {
  totalCases: number
  language: string[]
  cases: DatasetCase[]
}

const datasetPath = join(process.cwd(), 'scam-message-dataset.json')
const dataset: Dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))

let passed = 0
let failed = 0
const failures: { id: string; category: string; expected: string; got: string; score: number; reasons: string[] }[] = []

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Scam Engine Test Runner — scam-message-dataset.json')
console.log(`  ${dataset.totalCases} cases | language: ${dataset.language.join(', ')}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

for (const c of dataset.cases) {
  const result = analyzeText(c.message)
  const ok = result.riskLevel === c.expectedRisk

  if (ok) {
    passed++
    console.log(`  ✅  [${c.id}] → ${result.riskLevel.toUpperCase()} (${result.totalScore})`)
  } else {
    failed++
    const reasons = result.signals.map((s) => `${s.label}(${s.score})`)
    failures.push({
      id: c.id,
      category: c.category,
      expected: c.expectedRisk,
      got: result.riskLevel,
      score: result.totalScore,
      reasons,
    })
    console.log(`  ❌  [${c.id}] expected ${c.expectedRisk.toUpperCase()} | got ${result.riskLevel.toUpperCase()} (${result.totalScore})`)
    console.log(`       ${c.message.slice(0, 100)}`)
    console.log(`       signals: ${reasons.join(', ')}`)
  }
}

const total = passed + failed
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Result: ${passed}/${total} passed — ${failed} failed`)

if (failures.length > 0) {
  console.log('\n  FAILURES SUMMARY:')
  for (const f of failures) {
    console.log(`    [${f.id}] (${f.category})`)
    console.log(`      expected=${f.expected}  got=${f.got}(${f.score})`)
    console.log(`      reasons: ${f.reasons.join(', ')}`)
  }
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

process.exit(failed > 0 ? 1 : 0)
