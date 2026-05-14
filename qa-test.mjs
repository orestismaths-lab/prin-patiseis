// ── Inline port of extractors + scamEngine for QA testing ────────────────────

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function extractUrls(text) {
  const m = text.match(/https?:\/\/[^\s<>"'()[\]{}]+/gi) ?? []
  return [...new Set(m)]
}

function extractDomains(text) {
  const urls = extractUrls(text)
  const domains = []
  for (const url of urls) {
    try { const { hostname } = new URL(url); if (hostname) domains.push(hostname.toLowerCase()) } catch {}
  }
  const bare = text.match(/\b([a-z0-9][-a-z0-9]{0,62}\.(?:gr|com|net|org|info|ru|xyz|tk|top|click|online|site|shop|live|eu|io|vip|icu|support|cc|digital|network))\b/gi) ?? []
  for (const d of bare) domains.push(d.toLowerCase())
  return [...new Set(domains)]
}

function extractEmails(text) {
  return [...new Set(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [])]
}

function hasLink(text) {
  return /https?:\/\//i.test(text) || /\bwww\./i.test(text) || extractDomains(text).length > 0
}

function extractPhoneNumbers(text) {
  const re = /(?:\+30|0030)?[ -]?(?:6\d{2}|2\d{2}|90[19]\d)[ -]?\d{3}[ -]?\d{3,4}/g
  return [...new Set(text.match(re) ?? [])].map(p => p.trim())
}

function isPremiumRatePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('30') && digits.length > 10 ? digits.slice(2) : digits
  return local.startsWith('901') || local.startsWith('909')
}

const KNOWN = [
  'gov.gr','aade.gr','myaade.gov.gr','efka.gov.gr','minedu.gov.gr','ypes.gov.gr',
  'elta.gr','dei.gr','deddie.gr','desfa.gr','eurobank.gr','alpha.gr','nbg.gr',
  'piraeusbank.gr','winbank.gr','eurobank.com.gr','cosmote.gr','wind.gr','vodafone.gr',
  'nova.gr','taxisnet.gov.gr','e-efka.gov.gr',
  'eopyy.gov.gr','fuelpass.gov.gr','powerpass.gov.gr','epass.gov.gr',
  'yme.gov.gr','netflix.com','amazon.com','amazon.co.uk',
  'microsoft.com','apple.com','icloud.com',
  'fedex.com','dhl.com','ups.com',
  'skroutz.gr','e-shop.gr','public.gr',
]
function isKnownDomain(d) { const l = d.toLowerCase(); return KNOWN.some(k => l === k || l.endsWith('.' + k)) }

const URGENCY = [
  'αμεσα','αμεσως','επειγον','τωρα','σημερα','εντος','24 ωρες','48 ωρες','ληγει','λιγει',
  'απαιτειται','αμελλητι','urgent','immediately','expire','expires','deadline',
  'εκπνοη','εκπνεει','τελευταια ευκαιρια','προθεσμια','καταληκτικη',
  'αμεση δραση','αμεση ενεργεια',
]
const FEAR = [
  'αποκλεισμος','απενεργοποιηση','αναστολη','παγωμενος','μπλοκαρε','blocked','suspended',
  'disabled','κλειδωμα','κλειδωθηκε','διαγραφη','απαγορευση','παραβιαση',
  'unauthorized','illegal','παρανομη',
  'ιος','μολυνθηκε','μολυνση','χακαρ','hacked','επιθεση','κινδυνος',
  'διαρροη','κλεψιμο','κλεφτης','κλεφτες',
]
const CREDS = [
  'κωδικ','password','pin','otp','αριθμος καρτ','αριθμο καρτ','cvv','cvc','iban',
  'τραπεζικ','στοιχει','επιβεβαιωσ','verification','verify',
  'αριθμος λογαριασμ','αριθμο λογαριασμ','one-time','one time','αυθεντικοποιηση','2fa','sms code',
  'username','αφμ','αμκα','αριθμο ταυτοτητας','αριθμος ταυτοτητας','ταυτοτητα',
  'διαβατηριο','αριθμος διαβατηριου',
]
const PAYMENT = [
  'πληρωση','πληρωσε','payment','pay','χρεωση','οφειλη','ληξιπροθεσμη','χρεος',
  'εκκρεμοτητα','ποσο','ευρω','€','προστιμο','φορος',
  'ανεξοφλητ','διοδιο','παραβαση','εισφορ','τελη','αντιτιμο','συνδρομη','τελος','κοστος',
  'αποζημιωση','επιστροφη χρηματων',
]
const REWARD = [
  'κερδισ','κερδη','νικητης','δωρο','prize','winner','congratulations','συγχαρητηρια','επιστροφη',
  'επιστροφη φορου','refund','cashback','bonus','εκπληξη','δωρεαν','free','gift',
  'επιδομα','αποζημιωση','φορολοταρια','voucher','επιδοτηση','χρηματοδοτηση','επιχορηγηση',
]
const BRANDS = {
  'ΑΑΔΕ / Εφορία': { keywords: ['ααδε','aade','εφορια','taxisnet','myaade'], domains: ['aade.gr','myaade.gov.gr','taxisnet.gov.gr'] },
  'ΕΛΤΑ': { keywords: ['ελτα','elta','ταχυδρομει','δεμα','parcel','τελωνει'], domains: ['elta.gr'] },
  'ΔΕΗ': { keywords: ['δεη','dei','ρευμα','ηλεκτρικο'], domains: ['dei.gr','deddie.gr'] },
  'Eurobank': { keywords: ['eurobank'], domains: ['eurobank.gr'] },
  'Alpha Bank': { keywords: ['alpha bank','alphabank'], domains: ['alpha.gr'] },
  'Εθνική Τράπεζα': { keywords: ['nbg','εθνικη τραπεζα','national bank'], domains: ['nbg.gr'] },
  'Τράπεζα Πειραιώς': { keywords: ['πειραιως','piraeus','winbank'], domains: ['piraeusbank.gr','winbank.gr'] },
  'Cosmote / e-pay': { keywords: ['cosmote','e-pay','epay'], domains: ['cosmote.gr'] },
  'ΕΦΚΑ': { keywords: ['εφκα','efka'], domains: ['efka.gov.gr','e-efka.gov.gr'] },
  'Ελληνική Αστυνομία': { keywords: ['αστυνομια','police','ελληνικη αστυνομια'], domains: [] },
  'ΕΟΠΥΥ': { keywords: ['εοπυυ','eopyy','ασφαλιστικη ικανοτητα','υγειονομικη'], domains: ['eopyy.gov.gr'] },
  'Fuel Pass / Power Pass': { keywords: ['fuel pass','power pass','epass','καυσιμ επιδομ'], domains: ['fuelpass.gov.gr','powerpass.gov.gr','epass.gov.gr'] },
  'Netflix': { keywords: ['netflix','συνδρομη netflix'], domains: ['netflix.com'] },
  'Amazon': { keywords: ['amazon','prime'], domains: ['amazon.com','amazon.co.uk'] },
  'Microsoft / Apple': { keywords: ['microsoft','windows','apple support','icloud'], domains: ['microsoft.com','apple.com','icloud.com'] },
  'Τροχαία / ΥΜΕ': { keywords: ['τροχαια','yme','υπ. μεταφορων','αδεια οδηγησης','κτεο','διοδι','κλιση τροχαιας'], domains: ['yme.gov.gr'] },
  'Courier / Delivery': { keywords: ['fedex','dhl','ups','boxnow','speedex','acs courier','γενικη ταχυδρομικη'], domains: ['fedex.com','dhl.com','ups.com'] },
}
const SUSP_TLDS = ['.ru','.xyz','.tk','.top','.click','.online','.site','.shop','.live','.info','.vip','.icu','.support','.cc','.digital','.network']
const REMOTE_TOOLS = ['anydesk','teamviewer','απομακρυσμενη προσβαση','απομακρυσμενο','remote access','remote desktop','απομακρυσμενος ελεγχος']
const FAMILY_WORDS = ['μαμα','μπαμπα','μαμά','μπαμπά','γονεας','γονεις','αδελφε','αδελφη']
const NEW_NUMBER_WORDS = ['νεος αριθμος','νεο νουμερο','αλλαξα αριθμο','νεο τηλεφωνο','new number','αλλαξα κινητο']
const SEND_MONEY_WORDS = ['στειλε','στείλε','μεταφορα χρηματων','εμβασμα','χρηματα τωρα','χρηματα αμεσα']
const TX_ALERT_WORDS = ['εγκριθηκε','εγκρίθηκε','χρεωθηκε','χρεώθηκε','πραγματοποιηθηκε','authorized purchase','εγκεκριμενη αγορα']
const CANCEL_LINK_WORDS = ['ακυρωστε','ακυρώστε','ακυρωσ','δεν αναγνωριζετε','δεν εκανατε','δεν κανατε','cancel','δεν ειναι δικη σας']
const INVEST_WORDS = ['εγγυημενη αποδοση','εγγυημενες αποδοσεις','επενδυστε','bitcoin','κρυπτονομισμ','forex','trading platform']

function containsAny(text, words) { const n = norm(text); return words.some(w => n.includes(norm(w))) }
function countMatches(text, words) { const n = norm(text); return words.filter(w => n.includes(norm(w))).length }
function brandDomainPresent(detected, brandDomains) {
  if (!brandDomains.length) return false
  return detected.some(d => brandDomains.some(bd => d === bd || d.endsWith('.' + bd)))
}

function analyzeText(text) {
  const signals = []; let totalScore = 0
  const domains = extractDomains(text)
  const emails = extractEmails(text)
  const phones = extractPhoneNumbers(text)
  const msgHasLink = hasLink(text)
  const unknownDomains = domains.filter(d => !isKnownDomain(d))
  const knownDomains = domains.filter(d => isKnownDomain(d))

  // 0. Known phishing domains (simplified — manualPhishingDomains list)
  const MANUAL_PHISHING = ['myaade-gr.ru','aade-online.xyz','elta-tracking.top','dei-payment.click','efka-online.site']
  const knownPhishing = domains.filter(d => MANUAL_PHISHING.some(p => d === p || d.endsWith('.' + p)))
  if (knownPhishing.length > 0) { signals.push({ label: 'Γνωστός phishing σύνδεσμος', s: 50 }); totalScore += 50 }

  // 1. Unknown domains
  if (unknownDomains.length > 0) { const s = Math.min(unknownDomains.length * 20, 40); signals.push({ label: 'Ύποπτος σύνδεσμος', s }); totalScore += s }

  // 2. Urgency
  const uc = countMatches(text, URGENCY); if (uc > 0) { const s = Math.min(uc*8,20); signals.push({ label: 'Επείγον', s }); totalScore += s }

  // 3. Fear
  const fc = countMatches(text, FEAR); if (fc > 0) { const s = Math.min(fc*10,25); signals.push({ label: 'Φόβος/αποκλεισμός', s }); totalScore += s }

  // 4. Credentials
  const cc = countMatches(text, CREDS); if (cc > 0) { const s = Math.min(cc*12,30); signals.push({ label: 'Κωδικοί/στοιχεία', s }); totalScore += s }

  // 5. Payment
  const pc = countMatches(text, PAYMENT); if (pc > 0) { const s = Math.min(pc*7,20); signals.push({ label: 'Πληρωμή', s }); totalScore += s }

  // 6. Reward / benefit
  const rc = countMatches(text, REWARD); if (rc > 0) { const s = Math.min(rc*10,25); signals.push({ label: 'Δώρο/επίδομα/επιστροφή', s }); totalScore += s }

  // 7. Brand impersonation (score 35 if unknown domain present, else 15)
  for (const [brand, { keywords, domains: bd }] of Object.entries(BRANDS)) {
    if (containsAny(text, keywords) && !brandDomainPresent(domains, bd)) {
      const s = unknownDomains.length > 0 ? 35 : 15
      signals.push({ label: `Παρουσίαση ως ${brand}`, s }); totalScore += s
    }
  }

  // 8. Suspicious email
  const suspEmails = emails.filter(e => !isKnownDomain(e.split('@')[1] ?? ''))
  if (suspEmails.length > 0) { signals.push({ label: 'Ύποπτο email', s: 15 }); totalScore += 15 }

  // 9. IP URL
  const ipMatch = text.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i)
  if (ipMatch) { signals.push({ label: 'IP URL', s: 25 }); totalScore += 25 }

  // 10. Suspicious TLDs
  const suspTldDomains = domains.filter(d => SUSP_TLDS.some(t => d.endsWith(t)))
  if (suspTldDomains.length > 0) { const s = Math.min(suspTldDomains.length * 10, 30); signals.push({ label: 'Ύποπτο TLD', s }); totalScore += s }

  // 11. Premium phone
  const premiumPhones = phones.filter(isPremiumRatePhone)
  if (premiumPhones.length > 0) { signals.push({ label: 'Premium rate phone', s: 30 }); totalScore += 30 }

  // 12. Typosquatting — simplified (skip for inline QA, covered by other signals)

  // 13. Remote access / tech support
  if (containsAny(text, REMOTE_TOOLS)) { signals.push({ label: 'Απομακρυσμένη πρόσβαση', s: 50 }); totalScore += 50 }

  // 14. Family emergency
  if (containsAny(text, FAMILY_WORDS) && (containsAny(text, NEW_NUMBER_WORDS) || containsAny(text, SEND_MONEY_WORDS))) {
    const alsoMoney = containsAny(text, ['€','ευρω','χρηματα','εμβασμα','μεταφορα'])
    const s = alsoMoney ? 55 : 30
    signals.push({ label: 'Οικογενειακή απάτη', s }); totalScore += s
  }

  // 15. Fake transaction alert
  if (containsAny(text, TX_ALERT_WORDS) && containsAny(text, CANCEL_LINK_WORDS) && msgHasLink) {
    signals.push({ label: 'Ψεύτικη ειδοποίηση συναλλαγής', s: 40 }); totalScore += 40
  }

  // 16. Investment scam
  const ic = countMatches(text, INVEST_WORDS)
  if (ic >= 1 && containsAny(text, ['%','αποδοση','κερδος','κερδη'])) {
    const s = ic >= 2 ? 55 : 35
    signals.push({ label: 'Επενδυτική απάτη', s }); totalScore += s
  }

  // Hard rule: link + credentials → min 70
  if (msgHasLink && containsAny(text, CREDS)) {
    totalScore = Math.max(totalScore, 70)
    if (!signals.some(s => s.label.includes('σύνδεσμος'))) signals.push({ label: 'Link+credentials', s: 70 })
  }

  // Hard rule: brand impersonation + unknown domain + payment/urgency/reward → min 70
  const hasBrandImp = signals.some(s => s.label.includes('Παρουσίαση'))
  const hasPayUrgReward = containsAny(text, [...PAYMENT, ...URGENCY, ...REWARD])
  if (hasBrandImp && unknownDomains.length > 0 && hasPayUrgReward) {
    totalScore = Math.max(totalScore, 70)
  }

  totalScore = Math.min(totalScore, 100)
  const level = totalScore >= 60 ? 'ΕΠΙΚΙΝΔΥΝΟ' : totalScore >= 30 ? 'ΥΠΟΠΤΟ' : 'ΧΑΜΗΛΟΣ'
  return { level, totalScore, signals: signals.map(s => `${s.label}(${s.s})`), unknownDomains, knownDomains }
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0; let failed = 0

function test(name, text, expectedLevel, extraChecks = {}) {
  const r = analyzeText(text)
  const levelOk = r.level === expectedLevel
  const checksOk = Object.entries(extraChecks).every(([k, v]) => {
    if (k === 'scoreMax') return r.totalScore <= v
    if (k === 'scoreMin') return r.totalScore >= v
    if (k === 'hasSignal') return r.signals.some(s => s.includes(v))
    return true
  })
  if (levelOk && checksOk) {
    passed++; console.log(`  ✅  ${name} → ${r.level} (${r.totalScore})`)
  } else {
    failed++
    console.log(`  ❌  ${name}`)
    console.log(`      Expected: ${expectedLevel} | Got: ${r.level} (${r.totalScore})`)
    console.log(`      Signals: ${r.signals.join(', ')}`)
    if (r.unknownDomains.length) console.log(`      Unknown domains: ${r.unknownDomains.join(', ')}`)
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  QA TESTS — Πριν Πατήσεις scam engine')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// ── GROUP 1: Original επικίνδυνα ──────────────────────────────────────────────
console.log('▸ ΕΠΙΚΙΝΔΥΝΑ (score ≥ 61)')

test('ΑΑΔΕ phishing .ru + κωδικός taxisnet',
  'ΑΑΔΕ: Επιστροφή φόρου 284€. Πατήστε αμέσως: https://myaade-epstrofi.ru/verify. Εισάγετε κωδικό taxisnet.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61, scoreMax: 100 })

test('Τράπεζα phishing — PIN + link',
  'Ο λογαριασμός σας έχει αποκλειστεί. Επαληθεύστε το PIN και τον κωδικό σας άμεσα: http://alpha-bank-secure.xyz/login',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Hard rule: HTTPS link + OTP',
  'Παρακαλούμε εισάγετε τον κωδικό OTP: https://pay-secure.click/verify',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΕΛΤΑ phishing — δέμα + IBAN',
  'ΕΛΤΑ: Εκκρεμεί η παράδοση δέματος. Δώστε IBAN: https://elta-delivery.shop/pay',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Score capped at 100',
  'Κερδίσατε! Αμέσως τώρα, ο λογαριασμός σας αποκλείστηκε. Δώστε PIN, κωδικό, CVV, OTP. https://scam.ru/win',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMax: 100 })

test('www. link + "κωδικό" accusative — hard rule',
  'Επαλήθευσε τον κωδικό σου στο www.fake-bank.com τώρα.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('4 suspicious TLD domains — πρέπει να φτάνει ≥ 61',
  'Δείτε: https://scam1.xyz https://scam2.ru https://scam3.top https://scam4.click',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

// ── GROUP 2: Original ύποπτα ──────────────────────────────────────────────────
console.log('\n▸ ΥΠΟΠΤΑ (score 31-60)')

test('ΑΑΔΕ brand + urgency χωρίς link',
  'ΑΑΔΕ: Επικοινωνήστε αμέσως. Εκκρεμεί φόρος.',
  'ΥΠΟΠΤΟ', { scoreMin: 30 })

test('Ύποπτο TLD χωρίς credentials',
  'Δείτε την προσφορά μας: https://bestdeals.xyz/summer',
  'ΥΠΟΠΤΟ')

test('Reward bait + urgency (χωρίς link)',
  'Συγχαρητήρια! Κερδίσατε δώρο 1000€. Επικοινωνήστε αμέσως.',
  'ΥΠΟΠΤΟ')

test('IP address URL — χωρίς credentials',
  'Επαλήθευση απαιτείται: http://45.33.32.156/info',
  'ΥΠΟΠΤΟ')

test('Ύποπτο email με brand + .ru',
  'Για επαλήθευση επικοινωνήστε: support@nbg-secure.ru',
  'ΕΠΙΚΙΝΔΥΝΟ')

// ── GROUP 3: Original χαμηλός ─────────────────────────────────────────────────
console.log('\n▸ ΧΑΜΗΛΟΣ ΚΙΝΔΥΝΟΣ (score 0-30)')

test('Κανονικό gov.gr URL',
  'Ενημερωθείτε στο https://www.gov.gr για τις ανακοινώσεις.',
  'ΧΑΜΗΛΟΣ', { scoreMax: 30 })

test('Irrelevant text',
  'Γεια σου! Τι κάνεις; Τα παιδιά είναι καλά;',
  'ΧΑΜΗΛΟΣ', { scoreMax: 5 })

test('Γνήσιο Eurobank SMS',
  'Eurobank: Εγκρίθηκε συναλλαγή 45€. Λεπτομέρειες: https://eurobank.gr/transactions',
  'ΧΑΜΗΛΟΣ', { scoreMax: 30 })

test('ΑΑΔΕ official domain — δεν είναι impersonation',
  'Ενημέρωση ΑΑΔΕ: https://myaade.gov.gr',
  'ΧΑΜΗΛΟΣ', { scoreMax: 10 })

test('Urgency μόνο — δεν φτάνει threshold',
  'Σήμερα λήγει η προθεσμία υποβολής. Επείγον.',
  'ΧΑΜΗΛΟΣ', { scoreMax: 30 })

// ── GROUP 4: Edge cases ───────────────────────────────────────────────────────
console.log('\n▸ EDGE CASES — OCR normalization, declined forms, boundary conditions')

test('OCR χωρίς τόνους — ΑΜΕΣΑ ΑΠΟΚΛΕΙΣΤΗΚΕ ΚΩΔΙΚΟΣ',
  'ΑΜΕΣΑ ΕΠΕΙΓΟΝ: Ο λογαριασμος σας ΑΠΟΚΛΕΙΣΤΗΚΕ. Δωστε ΚΩΔΙΚΟ: https://bank-verify.top/login',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('OCR all-caps — ΚΩΔΙΚΟ (accusative, no accent)',
  'ΠΑΤΗΣΤΕ ΕΔΩ ΚΑΙ ΔΩΣΤΕ ΤΟΝ ΚΩΔΙΚΟ ΣΑΣ: https://evil.ru/verify',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Eurobank keyword + eurobank.gr domain — ΔΕΝ flaggάρεται ως impersonation',
  'Eurobank: Νέα ενημέρωση. https://eurobank.gr/account',
  'ΧΑΜΗΛΟΣ')

test('Eurobank keyword + gov.gr domain — brand flagged, score low (no other signals)',
  'Eurobank: Η συναλλαγή σας απαιτεί επαλήθευση. https://gov.gr/update',
  'ΧΑΜΗΛΟΣ')

test('Score δεν ξεπερνά 100',
  'Κερδίσατε 5000€! ΑΜΕΣΑ δώστε κωδικό PIN CVV OTP IBAN κάρτας. Αποκλεισμός. https://win.ru/free https://prize.xyz/gift',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMax: 100 })

test('"στοιχεία" (plural nom) — stem "στοιχει" πρέπει να ταιριάζει',
  'Παρακαλώ δώστε τα στοιχεία σας: https://verify.click/form',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('"τραπεζικά" — stem "τραπεζικ" πρέπει να ταιριάζει',
  'Απαιτούνται τα τραπεζικά σας στοιχεία: https://update.xyz/bank',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

// ── GROUP 5: Νέα σενάρια (53 scam examples coverage) ─────────────────────────
console.log('\n▸ ΝΕΑ ΣΕΝΑΡΙΑ — Traffic fines, ΕΟΠΥΥ, tech support, κ.α.')

test('Τροχαία: παράβαση + payment + link',
  'Τροχαία: Ανεξόφλητη παράβαση 80€. Πληρώστε αμέσως: https://trochaiagreece.info/pay',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΕΟΠΥΥ: ανασταλεί + link',
  'ΕΟΠΥΥ: Η ασφαλιστική σας ικανότητα έχει ανασταλεί. Ανανεώστε: https://eopyy-renewal.top',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Fuel Pass phishing',
  'Το Fuel Pass σας είναι έτοιμο. Κατεβάστε τώρα: https://fuelpass-gr.xyz/claim',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Power Pass phishing',
  'Power Pass: Λάβετε το επίδομά σας τώρα: https://powerpass-apply.top/login',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Netflix συνδρομή έληξε',
  'Η συνδρομή σου στο Netflix έχει λήξει. Ανανέωσε εδώ: https://netflix-renew.site/gr',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Amazon Prime phishing',
  'Amazon: Η συνδρομή σας Prime έληξε. Ανανεώστε: https://amazon-gr.top/renew',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('AnyDesk tech support scam',
  'Η Microsoft εντόπισε ιό στον υπολογιστή σας. Κατεβάστε AnyDesk για απομακρυσμένη πρόσβαση.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('TeamViewer tech support + link',
  'Windows: Ο υπολογιστής σας έχει μολυνθεί. Εγκαταστήστε TeamViewer: https://ms-support.top',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Οικογενειακή απάτη — νέος αριθμός + στείλε χρήματα',
  'Μαμά είμαι εγώ. Έχασα το κινητό μου, αυτός είναι ο νέος αριθμός μου. Χρειάζομαι 500€ αμέσως, στείλε μεταφορά.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Οικογενειακή απάτη — νέος αριθμός μόνο (ύποπτο)',
  'Μπαμπά, έχασα το κινητό μου. Αυτός είναι ο νέος αριθμός μου.',
  'ΥΠΟΠΤΟ', { scoreMin: 30 })

test('Fake fraud alert — αγορά εγκρίθηκε + ακυρώστε + link',
  'Αγορά 350€ εγκρίθηκε από τον λογαριασμό σας. Αν δεν εκάνατε αυτή την αγορά, ακυρώστε εδώ: https://bank-cancel.top',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Investment scam — εγγυημένη απόδοση',
  'Εγγυημένη απόδοση 35% σε 3 μήνες! Επενδύστε τώρα. Κέρδη εγγυημένα!',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Investment scam — Bitcoin',
  'Κερδίστε με Bitcoin trading. Εγγυημένες αποδόσεις 40%. Κέρδη κάθε μέρα!',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΕΛΤΑ delivery + τελωνεία + payment',
  'ΕΛΤΑ: Το δέμα σας αναμένει τέλη τελωνείου. Πληρώστε 2.90€: https://elta-gr.top/customs',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΑΜΚΑ / ΑΦΜ credential request',
  'Επιβεβαιώστε τον ΑΜΚΑ και τον ΑΦΜ σας για να συνεχίσετε: https://efka-verify.xyz',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Διόδια phishing',
  'Ανεξόφλητο διόδιο 3.10€. Πληρώστε εντός 24 ωρών: https://odikes-gr.info/pay',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΕΦΚΑ επίδομα phishing',
  'ΕΦΚΑ: Εγκρίθηκε επίδομα 300€. Για να το εισπράξετε: https://efka-epidoma.xyz/claim',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('ΔΕΗ ανεξόφλητο + link',
  'ΔΕΗ: Ανεξόφλητος λογαριασμός 180€. Πληρώστε σήμερα: https://dei-pay.top/invoice',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('FedEx delivery scam',
  'FedEx: Το δέμα σας δεν παραδόθηκε. Επιβεβαιώστε διεύθυνση: https://fedex-delivery.xyz/confirm',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('Marketplace wrong number pivot (low — generic)',
  'Συγγνώμη νόμιζα ότι μίλαγα με άλλον. Τι κάνεις;',
  'ΧΑΜΗΛΟΣ', { scoreMax: 10 })

// ── SUMMARY ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Αποτέλεσμα: ${passed}/${total} passed${failed > 0 ? ` — ${failed} FAILED` : ' — ALL PASS ✅'}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
