import { ScamResult, ScamSignal, RiskLevel, ScamConfig } from '@/types/scam'
import {
  extractDomains, extractEmails, hasLink, hasDefangedLink, hasShortenerUrl,
  extractPhoneNumbers, isPremiumRatePhone, refangUrl,
} from '@/lib/extractors'
import { domainCore, brandStemFromDomain, findImpersonatedBrand } from '@/lib/similarity'
import { DEFAULT_CONFIG } from '@/lib/defaultConfig'

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

// Strip URLs before keyword matching — URL paths/domains shouldn't drive keyword signals
function textOnly(text: string): string {
  return refangUrl(text).replace(/https?:\/\/[^\s]+/gi, ' ')
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

  // refanged for domain extraction; textOnly for keyword matching (strips URL paths/domains)
  const analyzed = refangUrl(text)
  const clean = textOnly(text)

  const domains = extractDomains(text)   // already calls refangUrl internally
  const emails = extractEmails(analyzed)
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

  // 1. Defanged URL (deliberately obfuscated link)
  if (hasDefangedLink(text)) {
    signals.push({ label: 'Σύνδεσμος με κρυπτογραφημένη μορφή (hxxps / [.])', score: 12 })
    totalScore += 12
  }

  // 2. URL shortener
  if (hasShortenerUrl(text)) {
    signals.push({ label: 'Σύντομος σύνδεσμος (bit.ly κ.α.) που κρύβει τον πραγματικό προορισμό', score: 20 })
    totalScore += 20
  }

  // 3. Unknown / suspicious domains
  if (unknownDomains.length > 0) {
    const score = Math.min(unknownDomains.length * 20, 40)
    signals.push({ label: 'Ύποπτος σύνδεσμος / domain', score, detail: unknownDomains.join(', ') })
    totalScore += score
  }

  // 4. Urgency words
  const urgencyCount = countMatches(clean, greek.urgencyWords)
  if (urgencyCount > 0) {
    const score = Math.min(urgencyCount * 8, 20)
    signals.push({ label: 'Λέξεις επείγοντος / πίεσης χρόνου', score })
    totalScore += score
  }

  // 5. Fear / blocked-account language
  const fearCount = countMatches(clean, greek.fearWords)
  if (fearCount > 0) {
    const score = Math.min(fearCount * 10, 25)
    signals.push({ label: 'Απειλή αποκλεισμού / παραβίασης λογαριασμού', score })
    totalScore += score
  }

  // 6. Credential / sensitive data requests
  const credCount = countMatches(clean, greek.credentialWords)
  if (credCount > 0) {
    const score = Math.min(credCount * 12, 30)
    signals.push({ label: 'Ζητά κωδικούς, PIN, OTP ή στοιχεία κάρτας', score })
    totalScore += score
  }

  // 7. Payment words
  const payCount = countMatches(clean, greek.paymentWords)
  if (payCount > 0) {
    const score = Math.min(payCount * 7, 20)
    signals.push({ label: 'Αναφορά σε πληρωμή ή οφειλή', score })
    totalScore += score
  }

  // 8. Reward / prize / refund / benefit bait
  const rewardCount = countMatches(clean, greek.rewardWords)
  if (rewardCount > 0) {
    const score = Math.min(rewardCount * 10, 25)
    signals.push({ label: 'Υπόσχεση δώρου, επιδόματος ή επιστροφής χρημάτων', score })
    totalScore += score
  }

  // 9. Brand impersonation — score 35 when unknown domain also present, else 15
  // Check both clean text AND domain names (typosquatting often puts brand name in domain)
  const domainsStr = domains.join(' ')
  for (const brand of greek.brands) {
    if ((containsAny(clean, brand.keywords) || containsAny(domainsStr, brand.keywords)) && !brandDomainPresent(domains, brand.domains)) {
      const score = unknownDomains.length > 0 ? 35 : 15
      signals.push({ label: `Πιθανή παρουσίαση ως ${brand.name}`, score })
      totalScore += score
    }
  }

  // 10. Suspicious email sender domain
  const suspiciousEmails = emails.filter((e) => {
    const domain = e.split('@')[1] ?? ''
    return !isKnownDomainFromConfig(domain, config)
  })
  if (suspiciousEmails.length > 0) {
    signals.push({ label: 'Ύποπτη διεύθυνση email αποστολέα', score: 15, detail: suspiciousEmails.join(', ') })
    totalScore += 15
  }

  // 11. IP-address URLs
  const ipUrlRegex = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i
  const ipMatch = analyzed.match(ipUrlRegex)
  if (ipMatch) {
    signals.push({ label: 'Σύνδεσμος με IP διεύθυνση (χωρίς domain)', score: 25, detail: ipMatch[0] })
    totalScore += 25
  }

  // 12. Suspicious TLDs
  const suspiciousTldDomains = domains.filter((d) => suspiciousTlds.some((tld) => d.endsWith(tld)))
  if (suspiciousTldDomains.length > 0) {
    const score = Math.min(suspiciousTldDomains.length * 10, 30)
    const tlds = [...new Set(suspiciousTldDomains.map((d) => '.' + d.split('.').pop()))].join(', ')
    signals.push({ label: 'Ύποπτη κατάληξη domain (π.χ. .ru, .xyz, .tk)', score, detail: tlds })
    totalScore += score
  }

  // 13. Premium-rate phone numbers (901x, 909x)
  const premiumPhones = phones.filter(isPremiumRatePhone)
  if (premiumPhones.length > 0) {
    signals.push({ label: 'Αριθμός υπερχρέωσης (premium rate)', score: 30, detail: premiumPhones.join(', ') })
    totalScore += 30
  }

  // 14. Domain typosquatting via Levenshtein similarity
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
      break
    }
  }

  // 15. Remote access / tech support scam
  const remoteToolWords = ['anydesk', 'teamviewer', 'απομακρυσμεν', 'remote access', 'remote desktop', 'απομακρυσμενος ελεγχος', 'εργαλειο υποστηριξης', 'security tool', 'support tool']
  if (containsAny(clean, remoteToolWords)) {
    signals.push({ label: 'Ζητά απομακρυσμένη πρόσβαση στη συσκευή σου', score: 50 })
    totalScore += 50
  }

  // 16. Family emergency scam (new number + send money / do-not-call)
  const familyWords = ['μαμα', 'μπαμπα', 'γονεας', 'γονεις', 'αδελφε', 'αδελφη']
  const newNumberWords = ['νεος αριθμος', 'νεο νουμερο', 'αλλαξα αριθμο', 'νεο τηλεφωνο', 'αλλαξα κινητο', 'εσπασε το κινητο', 'χαθηκε το κινητο']
  const doNotCallWords = ['μην με παρεις', 'μη με παρεις', 'μην τηλεφωνησεις', 'μην καλεσεις', 'do not call']
  const sendMoneyWords = ['στειλε', 'μεταφορα χρηματων', 'εμβασμα', 'χρηματα τωρα', 'χρηματα αμεσα', 'πληρωμη εδω']
  const familyMatch = containsAny(clean, familyWords)
  const familyContext = containsAny(clean, newNumberWords) || containsAny(clean, doNotCallWords) || containsAny(clean, sendMoneyWords)
  if (familyMatch && familyContext) {
    const alsoMoney = containsAny(clean, ['€', 'ευρω', 'χρηματα', 'εμβασμα', 'μεταφορα'])
    const score = alsoMoney ? 55 : 30
    signals.push({ label: 'Απάτη «οικογενειακής έκτακτης ανάγκης»', score })
    totalScore += score
  }

  // 17. Fake transaction alert with cancel link
  const txAlertWords = ['εγκριθηκε', 'χρεωθηκε', 'πραγματοποιηθηκε', 'authorized purchase', 'εγκεκριμενη αγορα', 'σε εξελιξη', 'νεα συσκευη']
  const cancelLinkWords = ['ακυρωστε', 'ακυρωσ', 'δεν αναγνωριζετε', 'δεν εκανατε', 'δεν κανατε', 'cancel', 'δεν ειστε εσεις', 'αν δεν ειστε']
  if (containsAny(clean, txAlertWords) && containsAny(clean, cancelLinkWords) && messageHasLink) {
    signals.push({ label: 'Ψεύτικη ειδοποίηση συναλλαγής με σύνδεσμο «ακύρωσης»', score: 40 })
    totalScore += 40
  }

  // 18. Investment / high-return scam
  const investWords = ['εγγυημενη αποδοση', 'εγγυημενες αποδοσεις', 'επενδυστε', 'bitcoin', 'κρυπτονομισμ', 'forex', 'trading platform', 'επενδυτικη πλατφορμα', 'αναληψη κερδων', 'κλειδωμενα κερδη', 'φορο αναληψης']
  const investCount = countMatches(clean, investWords)
  if (investCount >= 1 && containsAny(clean, ['%', 'αποδοση', 'κερδος', 'κερδη', 'κερδιζ'])) {
    const score = investCount >= 2 ? 55 : 35
    signals.push({ label: 'Ύποπτη επενδυτική προσφορά / απάτη υψηλών αποδόσεων', score })
    totalScore += score
  }

  // 19. Download / install app from message
  const downloadWords = ['κατεβαστε', 'εγκαταστηστε', 'download', 'install', 'κατεβαστε εφαρμογη', 'κατεβαστε το εργαλειο', 'κατεβαστε το security']
  if (containsAny(clean, downloadWords) && messageHasLink) {
    signals.push({ label: 'Ζητά εγκατάσταση εφαρμογής μέσω συνδέσμου', score: 35 })
    totalScore += 35
  }

  // 20. Money mule / transfer agent
  const muleMoney = ['μεταφορα χρηματων', 'μεταφορες χρηματων', 'transfer money', 'transfer agent', 'κατάθεσ', 'καταθεσ']
  const muleReward = ['προμηθεια', 'κρατατε', 'κρατηστε', 'commission', '10%', '15%', '20%']
  if (containsAny(clean, muleMoney) && containsAny(clean, muleReward)) {
    signals.push({ label: 'Πρόταση «money mule» — μεταφορά χρημάτων για προμήθεια', score: 50 })
    totalScore += 50
  }

  // 21. Greeklish detection — key credential/action words in Latin script
  const greeklishCreds = ['karta', 'blokaristei', 'stoixeia', 'password', 'kodikos', 'pliroste', 'epivevaioste', 'sindetheite', 'sundethite']
  if (containsAny(clean, greeklishCreds) && messageHasLink) {
    signals.push({ label: 'Greeklish — ύποπτα λεκτικά σε λατινικούς χαρακτήρες + σύνδεσμος', score: 25 })
    totalScore += 25
  }

  // ── Hard rule: unknown/defanged link + credential request = always dangerous ──
  // Requires an unknown domain or defanged link — a legit gov.gr link mentioning
  // ΑΜΚΑ in context should NOT trigger this.
  const hasCredentialRequest = containsAny(clean, greek.credentialWords)
  const linkIsRisky = unknownDomains.length > 0 || hasDefangedLink(text)
  if (linkIsRisky && hasCredentialRequest) {
    totalScore = Math.max(totalScore, 70)
    if (!signals.some((s) => s.label.includes('σύνδεσμος'))) {
      signals.push({ label: 'Ύποπτος σύνδεσμος + ζήτηση ευαίσθητων στοιχείων', score: 70 })
    }
  }

  // ── Hard rule: brand impersonation + unknown domain + payment/urgency/reward ──
  const hasBrandImpersonation = signals.some((s) => s.label.includes('παρουσίαση ως'))
  const hasPaymentOrUrgency = containsAny(clean, [...greek.paymentWords, ...greek.urgencyWords, ...greek.rewardWords])
  if (hasBrandImpersonation && unknownDomains.length > 0 && hasPaymentOrUrgency) {
    totalScore = Math.max(totalScore, 70)
  }

  // ── Hard rule: public service / gov-like sender + payment link ────────────────
  const publicServiceWords = ['τροχαια', 'παραβαση', 'κλιση τροχαιας', 'αδεια οδηγησης', 'δημος', 'στάθμευση', 'σταθμευση', 'τελωνειο', 'govpay', 'gov-pay', 'δικαστηριο', 'υπ. μεταφορων', 'κτεο']
  if (containsAny(clean, publicServiceWords) && messageHasLink && containsAny(clean, greek.paymentWords)) {
    totalScore = Math.max(totalScore, 70)
  }

  // ── Hard rule: courier/parcel + small fee + link ──────────────────────────────
  const parcelWords = ['δεμα', 'παρδοση', 'παραδοση', 'parcel', 'αποδεσμευση', 'αποστολης', 'επαναπρογραμματισμο', 'τελη', 'τελωνεια', 'τελωνειο', 'customs']
  const smallFeePattern = /[123456789][.,]\d{2}\s*€/
  if (containsAny(clean, parcelWords) && messageHasLink && smallFeePattern.test(text)) {
    totalScore = Math.max(totalScore, 70)
  }

  // ── Hard rule: remote access app + access code request ───────────────────────
  const remoteAccessApps = ['anydesk', 'teamviewer']
  const accessCodeRequest = ['κωδικ', 'κωδικο', 'κωδικο προσβασης', 'pin', 'otp']
  if (containsAny(clean, remoteAccessApps) && containsAny(clean, accessCodeRequest)) {
    totalScore = Math.max(totalScore, 80)
  }

  // ── Hard rule: investment + guaranteed return ─────────────────────────────────
  const guaranteedReturn = ['εγγυημενη αποδοση', 'εγγυημενο κερδος', 'guaranteed return', 'guaranteed profit']
  if (containsAny(clean, guaranteedReturn)) {
    totalScore = Math.max(totalScore, 70)
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
