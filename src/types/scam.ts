export type RiskLevel = 'low' | 'suspicious' | 'dangerous'

export interface ScamSignal {
  label: string
  score: number
  detail?: string
}

export interface ScamResult {
  riskLevel: RiskLevel
  totalScore: number
  signals: ScamSignal[]
  detectedDomains: string[]
  extractedText: string
}

export interface ScamConfigBrand {
  name: string
  keywords: string[]
  domains: string[]
}

export interface ScamConfigGreek {
  urgencyWords: string[]
  fearWords: string[]
  credentialWords: string[]
  paymentWords: string[]
  rewardWords: string[]
  brands: ScamConfigBrand[]
}

export interface ScamConfigMeta {
  version: number
  updatedAt: string
  note: string
}

export interface ScamConfig {
  _meta: ScamConfigMeta
  legitimateDomains: string[]
  phishingDomains: string[]
  manualPhishingDomains: string[]
  suspiciousTlds: string[]
  greek: ScamConfigGreek
}
