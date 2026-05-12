export type RiskLevel = 'low' | 'suspicious' | 'dangerous'

export interface ScamSignal {
  label: string
  score: number
}

export interface ScamResult {
  riskLevel: RiskLevel
  totalScore: number
  signals: ScamSignal[]
  detectedDomains: string[]
  extractedText: string
}
