import { ScamResult, ScamSignal, RiskLevel } from '@/types/scam'
import { extractDomains, extractEmails, hasLink } from '@/lib/extractors'
import { isKnownDomain } from '@/lib/domainRegistry'

// ── Greek normalization ────────────────────────────────────────────────────────
// OCR often strips accents (άμεσα → αμεσα, ΑΜΕΣΑ → αμεσα).
// Normalize both the haystack and each keyword before matching.
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Keyword dictionaries ──────────────────────────────────────────────────────
// Single (unaccented) form per word — norm() handles the rest at match time.

const URGENCY_WORDS = [
  'αμεσα', 'αμεσως', 'επειγον', 'τωρα', 'σημερα',
  'εντος', '24 ωρες', '48 ωρες', 'ληγει', 'λιγει',
  'απαιτειται', 'αμελλητι', 'urgent', 'immediately',
  'expire', 'expires', 'deadline',
]

const FEAR_WORDS = [
  'αποκλεισμος', 'απενεργοποιηση', 'αναστολη',
  'παγωμενος', 'μπλοκαρε', 'blocked', 'suspended', 'disabled',
  'κλειδωμα', 'κλειδωθηκε', 'διαγραφη', 'απαγορευση',
  'παραβιαση', 'unauthorized', 'illegal', 'παρανομη',
]

const CREDENTIAL_WORDS = [
  'κωδικος', 'password', 'pin', 'otp',
  'αριθμος καρτας', 'cvv', 'cvc', 'iban',
  'τραπεζικα', 'στοιχεια', 'επιβεβαιωση',
  'verification', 'verify', 'αριθμος λογαριασμου',
  'one-time', 'one time', 'αυθεντικοποιηση', '2fa', 'sms code',
]

const PAYMENT_WORDS = [
  'πληρωση', 'πληρωσε', 'payment', 'pay',
  'χρεωση', 'οφειλη', 'ληξιπροθεσμη', 'χρεος',
  'εκκρεμοτητα', 'ποσο', 'ευρω', '€', 'euro',
  'προστιμο', 'φορος',
]

const REWARD_WORDS = [
  'κερδισες', 'νικητης', 'δωρο', 'prize', 'winner',
  'congratulations', 'συγχαρητηρια', 'επιστροφη',
  'επιστροφη φορου', 'refund', 'cashback', 'bonus',
  'εκπληξη', 'δωρεαν', 'free', 'gift',
]

// Each brand has keywords AND its known legitimate domains.
// Impersonation is flagged only when keywords appear but none of the brand's
// own legitimate domains are present in the message.
const BRAND_IMPERSONATION: Record<string, { keywords: string[]; domains: string[] }> = {
  'ΑΑΔΕ / Εφορία': {
    keywords: ['ααδε', 'aade', 'εφορια', 'taxisnet', 'myaade'],
    domains: ['aade.gr', 'myaade.gov.gr', 'taxisnet.gov.gr'],
  },
  'ΕΛΤΑ': {
    keywords: ['ελτα', 'elta', 'ταχυδρομει', 'δεμα', 'parcel'],
    domains: ['elta.gr'],
  },
  'ΔΕΗ': {
    keywords: ['δεη', 'dei', 'ρευμα', 'ηλεκτρικο'],
    domains: ['dei.gr', 'deddie.gr'],
  },
  'Eurobank': {
    keywords: ['eurobank'],
    domains: ['eurobank.gr'],
  },
  'Alpha Bank': {
    keywords: ['alpha bank', 'alphabank'],
    domains: ['alpha.gr'],
  },
  'Εθνική Τράπεζα': {
    keywords: ['nbg', 'εθνικη τραπεζα', 'national bank'],
    domains: ['nbg.gr'],
  },
  'Τράπεζα Πειραιώς': {
    keywords: ['πειραιως', 'piraeus', 'winbank'],
    domains: ['piraeusbank.gr', 'winbank.gr'],
  },
  'Cosmote / e-pay': {
    keywords: ['cosmote', 'e-pay', 'epay'],
    domains: ['cosmote.gr'],
  },
  'ΕΦΚΑ': {
    keywords: ['εφκα', 'efka'],
    domains: ['efka.gov.gr', 'e-efka.gov.gr'],
  },
  'Ελληνική Αστυνομία': {
    keywords: ['αστυνομια', 'police', 'ελληνικη αστυνομια'],
    domains: [],
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function containsAny(text: string, words: string[]): boolean {
  const n = norm(text)
  return words.some((w) => n.includes(norm(w)))
}

function countMatches(text: string, words: string[]): number {
  const n = norm(text)
  return words.filter((w) => n.includes(norm(w))).length
}

function brandDomainPresent(detectedDomains: string[], brandDomains: string[]): boolean {
  if (brandDomains.length === 0) return false
  return detectedDomains.some((d) =>
    brandDomains.some((bd) => d === bd || d.endsWith('.' + bd))
  )
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function analyzeText(text: string): ScamResult {
  const signals: ScamSignal[] = []
  let totalScore = 0

  const domains = extractDomains(text)
  const emails = extractEmails(text)
  const messageHasLink = hasLink(text)

  const unknownDomains = domains.filter((d) => !isKnownDomain(d))
  const knownDomains = domains.filter((d) => isKnownDomain(d))

  // 1. Unknown / suspicious domains
  if (unknownDomains.length > 0) {
    const score = Math.min(unknownDomains.length * 20, 40)
    signals.push({ label: 'Ύποπτος σύνδεσμος / domain', score })
    totalScore += score
  }

  // 2. Urgency
  const urgencyCount = countMatches(text, URGENCY_WORDS)
  if (urgencyCount > 0) {
    const score = Math.min(urgencyCount * 8, 20)
    signals.push({ label: 'Λέξεις επείγοντος / πίεσης χρόνου', score })
    totalScore += score
  }

  // 3. Fear / blocked-account language
  const fearCount = countMatches(text, FEAR_WORDS)
  if (fearCount > 0) {
    const score = Math.min(fearCount * 10, 25)
    signals.push({ label: 'Απειλή αποκλεισμού / παραβίασης λογαριασμού', score })
    totalScore += score
  }

  // 4. Credential / sensitive data requests
  const credCount = countMatches(text, CREDENTIAL_WORDS)
  if (credCount > 0) {
    const score = Math.min(credCount * 12, 30)
    signals.push({ label: 'Ζητά κωδικούς, PIN, OTP ή στοιχεία κάρτας', score })
    totalScore += score
  }

  // 5. Payment words
  const payCount = countMatches(text, PAYMENT_WORDS)
  if (payCount > 0) {
    const score = Math.min(payCount * 7, 20)
    signals.push({ label: 'Αναφορά σε πληρωμή ή οφειλή', score })
    totalScore += score
  }

  // 6. Reward / prize / refund bait
  const rewardCount = countMatches(text, REWARD_WORDS)
  if (rewardCount > 0) {
    const score = Math.min(rewardCount * 10, 25)
    signals.push({ label: 'Υπόσχεση δώρου, βραβείου ή επιστροφής χρημάτων', score })
    totalScore += score
  }

  // 7. Brand impersonation — checked per-brand against that brand's own domains
  for (const [brand, { keywords, domains: brandDomains }] of Object.entries(BRAND_IMPERSONATION)) {
    if (containsAny(text, keywords) && !brandDomainPresent(domains, brandDomains)) {
      signals.push({ label: `Πιθανή παρουσίαση ως ${brand}`, score: 15 })
      totalScore += 15
    }
  }

  // 8. Suspicious email sender domain
  const suspiciousEmails = emails.filter((e) => {
    const domain = e.split('@')[1] ?? ''
    return !isKnownDomain(domain)
  })
  if (suspiciousEmails.length > 0) {
    signals.push({ label: 'Ύποπτη διεύθυνση email αποστολέα', score: 15 })
    totalScore += 15
  }

  // 9. Suspicious TLDs
  const suspiciousTlds = ['.ru', '.xyz', '.tk', '.top', '.click', '.online', '.site', '.shop', '.live']
  const hasSuspiciousTld = domains.some((d) => suspiciousTlds.some((tld) => d.endsWith(tld)))
  if (hasSuspiciousTld) {
    signals.push({ label: 'Ύποπτη κατάληξη domain (π.χ. .ru, .xyz, .tk)', score: 20 })
    totalScore += 20
  }

  // ── Hard rule: link + credential request = always dangerous ───────────────
  const hasCredentialRequest = containsAny(text, CREDENTIAL_WORDS)
  if (messageHasLink && hasCredentialRequest) {
    totalScore = Math.max(totalScore, 70)
    if (!signals.some((s) => s.label.includes('σύνδεσμος'))) {
      signals.push({ label: 'Σύνδεσμος + ζήτηση ευαίσθητων στοιχείων', score: 70 })
    }
  }

  // ── Cap and classify ──────────────────────────────────────────────────────
  totalScore = Math.min(totalScore, 100)

  let riskLevel: RiskLevel
  if (totalScore >= 61) riskLevel = 'dangerous'
  else if (totalScore >= 31) riskLevel = 'suspicious'
  else riskLevel = 'low'

  return {
    riskLevel,
    totalScore,
    signals,
    detectedDomains: [...unknownDomains, ...knownDomains],
    extractedText: text,
  }
}
