import { ScamResult, ScamSignal, RiskLevel } from '@/types/scam'
import { extractDomains, extractEmails, hasLink } from '@/lib/extractors'
import { isKnownDomain } from '@/lib/domainRegistry'

// ── Keyword dictionaries ──────────────────────────────────────────────────────

const URGENCY_WORDS = [
  'αμεσα', 'άμεσα', 'επειγον', 'επείγον', 'τωρα', 'τώρα', 'σημερα', 'σήμερα',
  'εντος', 'εντός', '24 ωρες', '24 ώρες', '48 ωρες', 'ληγει', 'λήγει',
  'απαιτειται', 'απαιτείται', 'αμελλητι', 'αμελλητί', 'urgent', 'immediately',
  'expire', 'expires', 'deadline',
]

const FEAR_WORDS = [
  'αποκλεισμος', 'αποκλεισμός', 'απενεργοποιηση', 'απενεργοποίηση',
  'αναστολη', 'αναστολή', 'παγωμενος', 'παγωμένος', 'μπλοκαρε', 'blocked',
  'suspended', 'disabled', 'κλειδωμα', 'κλείδωμα', 'κλειδωθηκε', 'κλειδώθηκε',
  'διαγραφη', 'διαγραφή', 'απαγορευση', 'απαγόρευση', 'παραβιαση', 'παραβίαση',
  'unauthorized', 'illegal', 'παρανομη', 'παράνομη',
]

const CREDENTIAL_WORDS = [
  'κωδικος', 'κωδικό', 'κωδικοί', 'κωδικοι', 'password', 'pin', 'otp',
  'αριθμος καρτας', 'αριθμό καρτας', 'cvv', 'cvc', 'iban', 'τραπεζικα',
  'τραπεζικά', 'στοιχεια', 'στοιχεία', 'επιβεβαιωση', 'επιβεβαίωση',
  'verification', 'verify', 'αριθμος λογαριασμου', 'one-time', 'one time',
  'αυθεντικοποιηση', 'αυθεντικοποίηση', '2fa', 'sms code',
]

const PAYMENT_WORDS = [
  'πληρωση', 'πληρωμή', 'πληρωσε', 'πλήρωσε', 'payment', 'pay',
  'χρεωση', 'χρέωση', 'οφειλη', 'οφειλή', 'ληξιπροθεσμη', 'ληξιπρόθεσμη',
  'χρεος', 'χρέος', 'εκκρεμοτητα', 'εκκρεμότητα', 'ποσο', 'ποσό',
  'ευρω', 'ευρώ', '€', 'euro', 'προστιμο', 'πρόστιμο', 'φορος', 'φόρος',
]

const REWARD_WORDS = [
  'κερδισες', 'κέρδισες', 'νικητης', 'νικητής', 'δωρο', 'δώρο', 'prize',
  'winner', 'congratulations', 'συγχαρητηρια', 'συγχαρητήρια', 'επιστροφη',
  'επιστροφή', 'επιστροφη φορου', 'refund', 'cashback', 'bonus',
  'εκπληξη', 'έκπληξη', 'δωρεαν', 'δωρεάν', 'free', 'gift',
]

const BRAND_IMPERSONATION: Record<string, string[]> = {
  'ΑΑΔΕ / Εφορία': ['ααδε', 'aade', 'εφορια', 'εφορία', 'taxisnet', 'myaade'],
  'ΕΛΤΑ': ['ελτα', 'elta', 'ταχυδρομει', 'ταχυδρομεί', 'δεμα', 'δέμα', 'parcel'],
  'ΔΕΗ': ['δεη', 'dei', 'ρευμα', 'ρεύμα', 'ηλεκτρικο', 'ηλεκτρικό'],
  'Eurobank': ['eurobank'],
  'Alpha Bank': ['alpha bank', 'alphabank'],
  'Εθνική Τράπεζα': ['nbg', 'εθνικη τραπεζα', 'εθνική τράπεζα', 'national bank'],
  'Τράπεζα Πειραιώς': ['πειραιως', 'πειραιώς', 'piraeus', 'winbank'],
  'Cosmote / e-pay': ['cosmote', 'e-pay', 'epay'],
  'ΕΦΚΑ / ΚΕΠΕΑ': ['εφκα', 'efka', 'κεπεα'],
  'Ελληνική Αστυνομία': ['αστυνομια', 'αστυνομία', 'police', 'ελληνικη αστυνομια'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function containsAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase()
  return words.some((w) => lower.includes(w))
}

function countMatches(text: string, words: string[]): number {
  const lower = text.toLowerCase()
  return words.filter((w) => lower.includes(w)).length
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function analyzeText(text: string): ScamResult {
  const signals: ScamSignal[] = []
  let totalScore = 0

  const lower = text.toLowerCase()
  const domains = extractDomains(text)
  const emails = extractEmails(text)
  const messageHasLink = hasLink(text)

  // 1. Unknown / suspicious domains
  const unknownDomains = domains.filter((d) => !isKnownDomain(d))
  const knownDomains = domains.filter((d) => isKnownDomain(d))

  if (unknownDomains.length > 0) {
    const score = Math.min(unknownDomains.length * 20, 40)
    signals.push({ label: 'Ύποπτος σύνδεσμος / domain', score })
    totalScore += score
  }

  // Known domain present is a weak positive signal — don't reduce score here
  // but do surface it to the user

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

  // 7. Brand impersonation
  for (const [brand, keywords] of Object.entries(BRAND_IMPERSONATION)) {
    if (containsAny(lower, keywords)) {
      // Only flag as impersonation if the known domain for that brand is NOT present
      const brandDomain = domains.some((d) => isKnownDomain(d))
      if (!brandDomain) {
        signals.push({ label: `Πιθανή παρουσίαση ως ${brand}`, score: 15 })
        totalScore += 15
      }
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

  // 9. Short suspicious TLDs (.ru, .xyz, .tk, .top, .click, etc.)
  const suspiciousTlds = ['.ru', '.xyz', '.tk', '.top', '.click', '.online', '.site', '.shop', '.live']
  const hasSuspiciousTld = domains.some((d) => suspiciousTlds.some((tld) => d.endsWith(tld)))
  if (hasSuspiciousTld) {
    signals.push({ label: 'Ύποπτη κατάληξη domain (π.χ. .ru, .xyz, .tk)', score: 20 })
    totalScore += 20
  }

  // ── Hard rule ─────────────────────────────────────────────────────────────
  // Link + credential request = always dangerous
  const hasCredentialRequest = containsAny(text, CREDENTIAL_WORDS)
  if (messageHasLink && hasCredentialRequest) {
    totalScore = Math.max(totalScore, 70)
    if (!signals.some((s) => s.label.includes('σύνδεσμος'))) {
      signals.push({ label: 'Σύνδεσμος + ζήτηση ευαίσθητων στοιχείων', score: 70 })
    }
  }

  // ── Risk level ────────────────────────────────────────────────────────────
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
