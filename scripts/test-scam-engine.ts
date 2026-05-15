// Local test runner — runs both scam and legit datasets through the real engine.
// Run with: npm run test:scam

import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzeText } from '@/lib/scamEngine'
import type { RiskLevel } from '@/types/scam'

interface DatasetCase {
  id: string
  category: string
  expectedRisk: RiskLevel
  message: string
  notes?: string
}

interface Dataset {
  totalCases?: number
  cases: DatasetCase[]
}

interface RunResult {
  passed: number
  failed: number
  failures: { id: string; category: string; expected: string; got: string; score: number; reasons: string[] }[]
}

function runDataset(label: string, dataset: Dataset): RunResult {
  const result: RunResult = { passed: 0, failed: 0, failures: [] }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  ${label}  (${dataset.cases.length} cases)`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  for (const c of dataset.cases) {
    const r = analyzeText(c.message)
    const ok = r.riskLevel === c.expectedRisk

    if (ok) {
      result.passed++
      console.log(`  ✅  [${c.id}] → ${r.riskLevel.toUpperCase()} (${r.totalScore})`)
    } else {
      result.failed++
      const reasons = r.signals.map((s) => `${s.label}(${s.score})`)
      result.failures.push({
        id: c.id,
        category: c.category,
        expected: c.expectedRisk,
        got: r.riskLevel,
        score: r.totalScore,
        reasons,
      })
      console.log(`  ❌  [${c.id}] expected ${c.expectedRisk.toUpperCase()} | got ${r.riskLevel.toUpperCase()} (${r.totalScore})`)
      console.log(`       ${c.message.slice(0, 100)}`)
      console.log(`       signals: ${reasons.join(', ')}`)
    }
  }

  return result
}

function load(filename: string): Dataset {
  return JSON.parse(readFileSync(join(process.cwd(), filename), 'utf8'))
}

const scamDataset = load('scam-message-dataset.json')
const legitDataset = load('legit-message-dataset.json')

const scamResult = runDataset('Scam messages — scam-message-dataset.json', scamDataset)
const legitResult = runDataset('Legit messages — legit-message-dataset.json', legitDataset)

const totalPassed = scamResult.passed + legitResult.passed
const totalFailed = scamResult.failed + legitResult.failed
const totalCases = totalPassed + totalFailed

// Summary
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log('  SUMMARY')
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  Scam cases:   ${scamResult.passed}/${scamResult.passed + scamResult.failed} passed`)
console.log(`  Legit cases:  ${legitResult.passed}/${legitResult.passed + legitResult.failed} passed`)
console.log(`  Total:        ${totalPassed}/${totalCases} passed — ${totalFailed} failed`)

const allFailures = [...scamResult.failures, ...legitResult.failures]
if (allFailures.length > 0) {
  console.log('\n  FAILURES:')
  for (const f of allFailures) {
    console.log(`    [${f.id}] (${f.category})`)
    console.log(`      expected=${f.expected}  got=${f.got}(${f.score})`)
    console.log(`      signals: ${f.reasons.join(', ')}`)
  }
}
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

process.exit(totalFailed > 0 ? 1 : 0)
