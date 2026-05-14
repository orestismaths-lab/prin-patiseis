import { ScamResult, ScamSignal, RiskLevel, ScamConfig } from '@/types/scam'
import { extractDomains, extractEmails, hasLink, extractPhoneNumbers, isPremiumRatePhone } from '@/lib/extractors'
import { domainCore, brandStemFromDomain, findImpersonatedBrand } from '@/lib/similarity'
import { DEFAULT_CONFIG } from '@/lib/defaultConfig'

// OCR often strips accents (άμεσα → αμεσα). Normalize both sides before matching.
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function containsAny(text: string, words: string[]): boolean {
  const n = norm(text)
  return words.some((w) => n.includes(norm(w)))
}

function countMatches(text: string, words: string[]): number {
  const n = norm(text)
  return words.filter((w) => n.includes(norm(w))).length
}

function isKnownDomainFromConfig(domain: string, config: ScamConfig): boolean {
  const lower = domain.toLowerCase()
  return config.legitimateDomains.some(
    (known) => lower === known || lower.endsWith('.' + known)
  )
}

function isPhishingDomain(domain: string, config: ScamConfig): boolean {
  const lower = domain.toLowerCase()
  const allPhishing = [...config.phishingDomains, ...config.manualPhishingDomains]
  return allPhishing.some((p) => lower === p || lower.endsWith('.' + p))
}

function brandDomainPresent(detectedDomains: string[], brandDomains: string[]): boolean {
  if (brandDomains.length === 0) return false
  return detectedDomains.some((d) =>
    brandDomains.some((bd) => d === bd || d.endsWith('.' + bd))
  )
}

export function analyzeText(text: string, config: ScamConfig = DEFAULT_CONFIG): ScamResult {
  const signals: ScamSignal[] = []
  let totalScore = 0

  const { greek, suspiciousTlds } = config

  const domains = extractDomains(text)
  const emails = extractEmails(text)
  const phones = extractPhoneNumbers(text)
  const messageHasLink = hasLink(text)

  const unknownDomains = domains.filter((d) => !isKnownDomainFromConfig(d, config))
  const knownDomains = domains.filter((d) => isKnownDomainFromConfig(d, config))

  // 0. Known phishing domains
  const knownPhishing = domains.filter((d) => isPhishingDomain(d, config))
  if (knownPhishing.length > 0) {
    signals.push({ label: 'Γνωστός phishing σύνδεσμος', score: 50, detail: knownPhishing.join(', ') })
    totalScore += 50
  }

  // 1. Unknown / suspicious domains
  if (unknownDomains.length > 0) {
    const score = Math.min(unknownDomains.length * 20, 40)
    signals.push({ label: 'Ύποπτος σύνδεσμος / domain', score, detail: unknownDomains.join(', ') })
    totalScore += score
  }

  // 2. Urgency words
  const urgencyCount = countMatches(text, greek.urgencyWords)
  if (urgencyCount > 0) {
    const score = Math.min(urgencyCount * 8, 20)
    signals.push({ label: 'Λέξεις επείγοντος / πίεσης χρόνου', score })
    totalScore += score
  }

  // 3. Fear / blocked-account language
  const fearCount = countMatches(text, greek.fearWords)
  if (fearCount > 0) {
    const score = Math.min(fearCount * 10, 25)
    signals.push({ label: 'Απειλή αποκλεισμού / παραβίασης λογαριασμού', score })
    totalScore += score
  }

  // 4. Credential / sensitive data requests
  const credCount = countMatches(text, greek.credentialWords)
  if (credCount > 0) {
    const score = Math.min(credCount * 12, 30)
    signals.push({ label: 'Ζητά κωδικούς, PIN, OTP ή στοιχεία κάρτας', score })
    totalScore += score
  }

  // 5. Payment words
  const payCount = countMatches(text, greek.paymentWords)
  if (payCount > 0) {
    const score = Math.min(payCount * 7, 20)
    signals.push({ label: 'Αναφορά σε πληρωμή ή οφειλή', score })
    totalScore += score
  }

  // 6. Reward / prize / refund bait
  const rewardCount = countMatches(text, greek.rewardWords)
  if (rewardCount > 0) {
    const score = Math.min(rewardCount * 10, 25)
    signals.push({ label: 'Υπόσχεση δώρου, βραβείου ή επιστροφής χρημάτων', score })
    totalScore += score
  }

  // 7. Brand impersonation — per-brand check against that brand's own domains
  for (const brand of greek.brands) {
    if (containsAny(text, brand.keywords) && !brandDomainPresent(domains, brand.domains)) {
      signals.push({ label: `Πιθανή παρουσίαση ως ${brand.name}`, score: 15 })
      totalScore += 15
    }
  }

  // 8. Suspicious email sender domain
  const suspiciousEmails = emails.filter((e) => {
    const domain = e.split('@')[1] ?? ''
    return !isKnownDomainFromConfig(domain, config)
  })
  if (suspiciousEmails.length > 0) {
    signals.push({ label: 'Ύποπτη διεύθυνση email αποστολέα', score: 15, detail: suspiciousEmails.join(', ') })
    totalScore += 15
  }

  // 9. IP-address URLs
  const ipUrlRegex = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i
  const ipMatch = text.match(ipUrlRegex)
  if (ipMatch) {
    signals.push({ label: 'Σύνδεσμος με IP διεύθυνση (χωρίς domain)', score: 25, detail: ipMatch[0] })
    totalScore += 25
  }

  // 10. Suspicious TLDs
  const suspiciousTldDomains = domains.filter((d) => suspiciousTlds.some((tld) => d.endsWith(tld)))
  if (suspiciousTldDomains.length > 0) {
    const score = Math.min(suspiciousTldDomains.length * 10, 30)
    const tlds = [...new Set(suspiciousTldDomains.map((d) => '.' + d.split('.').pop()))].join(', ')
    signals.push({ label: 'Ύποπτη κατάληξη domain (π.χ. .ru, .xyz, .tk)', score, detail: tlds })
    totalScore += score
  }

  // 11. Premium-rate phone numbers (901x, 909x)
  const premiumPhones = phones.filter(isPremiumRatePhone)
  if (premiumPhones.length > 0) {
    signals.push({ label: 'Αριθμός υπερχρέωσης (premium rate)', score: 30, detail: premiumPhones.join(', ') })
    totalScore += 30
  }

  // 12. Domain typosquatting via Levenshtein similarity
  const brandStems = [
    ...config.legitimateDomains.map(brandStemFromDomain),
    ...config.greek.brands.flatMap((b) => b.domains.map(brandStemFromDomain)),
  ]
  const uniqueStems = [...new Set(brandStems)].filter((s) => s.length >= 4)

  for (const domain of unknownDomains) {
    if (isPhishingDomain(domain, config)) continue
    const core = domainCore(domain)
    const hit = findImpersonatedBrand(core, uniqueStems)
    if (hit) {
      signals.push({
        label: 'Πιθανό typosquatting domain',
        score: 25,
        detail: `"${domain}" μοιάζει με γνωστό domain (${hit})`,
      })
      totalScore += 25
      break // one signal is enough even if multiple domains match
    }
  }

  // ── Hard rule: link + credential request = always dangerous ───────────────
  const hasCredentialRequest = containsAny(text, greek.credentialWords)
  if (messageHasLink && hasCredentialRequest) {
    totalScore = Math.max(totalScore, 70)
    if (!signals.some((s) => s.label.includes('σύνδεσμος'))) {
      signals.push({ label: 'Σύνδεσμος + ζήτηση ευαίσθητων στοιχείων', score: 70 })
    }
  }

  totalScore = Math.min(totalScore, 100)

  let riskLevel: RiskLevel
  if (totalScore >= 60) riskLevel = 'dangerous'
  else if (totalScore >= 30) riskLevel = 'suspicious'
  else riskLevel = 'low'

  return {
    riskLevel,
    totalScore,
    signals,
    detectedDomains: [...unknownDomains, ...knownDomains],
    extractedText: text,
  }
}
