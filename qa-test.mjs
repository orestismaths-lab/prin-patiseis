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
  const bare = text.match(/\b([a-z0-9][-a-z0-9]{0,62}\.(?:gr|com|net|org|info|ru|xyz|tk|top|click|online|site|shop|live|eu|io))\b/gi) ?? []
  for (const d of bare) domains.push(d.toLowerCase())
  return [...new Set(domains)]
}

function extractEmails(text) {
  return [...new Set(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [])]
}

function hasLink(text) {
  return /https?:\/\//i.test(text) || /\bwww\./i.test(text) || extractDomains(text).length > 0
}

const KNOWN = ['gov.gr','aade.gr','myaade.gov.gr','efka.gov.gr','minedu.gov.gr','ypes.gov.gr','elta.gr','dei.gr','deddie.gr','desfa.gr','eurobank.gr','alpha.gr','nbg.gr','piraeusbank.gr','winbank.gr','cosmote.gr','wind.gr','vodafone.gr','nova.gr','taxisnet.gov.gr','e-efka.gov.gr']
function isKnownDomain(d) { const l = d.toLowerCase(); return KNOWN.some(k => l === k || l.endsWith('.' + k)) }

const URGENCY = ['αμεσα','αμεσως','επειγον','τωρα','σημερα','εντος','24 ωρες','48 ωρες','ληγει','λιγει','απαιτειται','αμελλητι','urgent','immediately','expire','expires','deadline']
const FEAR = ['αποκλεισμος','απενεργοποιηση','αναστολη','παγωμενος','μπλοκαρε','blocked','suspended','disabled','κλειδωμα','κλειδωθηκε','διαγραφη','απαγορευση','παραβιαση','unauthorized','illegal','παρανομη']
const CREDS = ['κωδικ','password','pin','otp','αριθμος καρτ','αριθμο καρτ','cvv','cvc','iban','τραπεζικ','στοιχει','επιβεβαιωσ','verification','verify','αριθμος λογαριασμ','αριθμο λογαριασμ','one-time','one time','αυθεντικοποιηση','2fa','sms code']
const PAYMENT = ['πληρωση','πληρωσε','payment','pay','χρεωση','οφειλη','ληξιπροθεσμη','χρεος','εκκρεμοτητα','ποσο','ευρω','€','προστιμο','φορος']
const REWARD = ['κερδισες','νικητης','δωρο','prize','winner','congratulations','συγχαρητηρια','επιστροφη','επιστροφη φορου','refund','cashback','bonus','εκπληξη','δωρεαν','free','gift']
const BRANDS = {
  'ΑΑΔΕ / Εφορία': { keywords: ['ααδε','aade','εφορια','taxisnet','myaade'], domains: ['aade.gr','myaade.gov.gr','taxisnet.gov.gr'] },
  'ΕΛΤΑ': { keywords: ['ελτα','elta','ταχυδρομει','δεμα','parcel'], domains: ['elta.gr'] },
  'ΔΕΗ': { keywords: ['δεη','dei','ρευμα','ηλεκτρικο'], domains: ['dei.gr','deddie.gr'] },
  'Eurobank': { keywords: ['eurobank'], domains: ['eurobank.gr'] },
  'Alpha Bank': { keywords: ['alpha bank','alphabank'], domains: ['alpha.gr'] },
  'Εθνική Τράπεζα': { keywords: ['nbg','εθνικη τραπεζα','national bank'], domains: ['nbg.gr'] },
  'Τράπεζα Πειραιώς': { keywords: ['πειραιως','piraeus','winbank'], domains: ['piraeusbank.gr','winbank.gr'] },
  'Cosmote / e-pay': { keywords: ['cosmote','e-pay','epay'], domains: ['cosmote.gr'] },
  'ΕΦΚΑ': { keywords: ['εφκα','efka'], domains: ['efka.gov.gr','e-efka.gov.gr'] },
  'Ελληνική Αστυνομία': { keywords: ['αστυνομια','police','ελληνικη αστυνομια'], domains: [] },
}

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
  const msgHasLink = hasLink(text)
  const unknownDomains = domains.filter(d => !isKnownDomain(d))
  const knownDomains = domains.filter(d => isKnownDomain(d))

  if (unknownDomains.length > 0) { const s = Math.min(unknownDomains.length * 20, 40); signals.push({ label: 'Ύποπτος σύνδεσμος', s }); totalScore += s }
  const uc = countMatches(text, URGENCY); if (uc > 0) { const s = Math.min(uc*8,20); signals.push({ label: 'Επείγον', s }); totalScore += s }
  const fc = countMatches(text, FEAR); if (fc > 0) { const s = Math.min(fc*10,25); signals.push({ label: 'Φόβος/αποκλεισμός', s }); totalScore += s }
  const cc = countMatches(text, CREDS); if (cc > 0) { const s = Math.min(cc*12,30); signals.push({ label: 'Κωδικοί/στοιχεία', s }); totalScore += s }
  const pc = countMatches(text, PAYMENT); if (pc > 0) { const s = Math.min(pc*7,20); signals.push({ label: 'Πληρωμή', s }); totalScore += s }
  const rc = countMatches(text, REWARD); if (rc > 0) { const s = Math.min(rc*10,25); signals.push({ label: 'Δώρο/επιστροφή', s }); totalScore += s }
  for (const [brand, { keywords, domains: bd }] of Object.entries(BRANDS)) {
    if (containsAny(text, keywords) && !brandDomainPresent(domains, bd)) {
      signals.push({ label: `Παρουσίαση ως ${brand}`, s: 15 }); totalScore += 15
    }
  }
  const suspEmails = emails.filter(e => !isKnownDomain(e.split('@')[1] ?? ''))
  if (suspEmails.length > 0) { signals.push({ label: 'Ύποπτο email', s: 15 }); totalScore += 15 }
  const suspTlds = ['.ru','.xyz','.tk','.top','.click','.online','.site','.shop','.live']
  const suspTldDomains = domains.filter(d => suspTlds.some(t => d.endsWith(t)))
  if (suspTldDomains.length > 0) { const s = Math.min(suspTldDomains.length * 10, 30); signals.push({ label: 'Ύποπτο TLD', s }); totalScore += s }
  if (msgHasLink && containsAny(text, CREDS)) { totalScore = Math.max(totalScore, 70); if (!signals.some(s => s.label.includes('σύνδεσμος'))) signals.push({ label: 'Link+credentials', s: 70 }) }
  totalScore = Math.min(totalScore, 100)
  const ipUrlRegex = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i
  if (ipUrlRegex.test(text)) { signals.push({ label: 'IP URL', s: 25 }); totalScore += 25 }
  const level = totalScore >= 60 ? 'ΕΠΙΚΙΝΔΥΝΟ' : totalScore >= 30 ? 'ΥΠΟΠΤΟ' : 'ΧΑΜΗΛΟΣ'
  return { level, totalScore, signals: signals.map(s => s.label), unknownDomains, knownDomains }
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

// ── GROUP 1: Επικίνδυνα ───────────────────────────────────────────────────────
console.log('▸ ΕΠΙΚΙΝΔΥΝΑ (score ≥ 61)')

test('ΑΑΔΕ phishing .ru + κωδικός taxisnet',
  'ΑΑΔΕ: Επιστροφή φόρου 284€. Πατήστε αμέσως: https://myaade-epstrofi.ru/verify. Εισάγετε κωδικό taxisnet.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61, scoreMax: 100 })

test('Τράπεζα phishing — PIN + link (accusative: "κωδικό")',
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

test('www. link + "κωδικό" accusative — hard rule πρέπει να πιάσει',
  'Επαλήθευσε τον κωδικό σου στο www.fake-bank.com τώρα.',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

test('4 suspicious TLD domains — πρέπει να φτάνει ≥ 61',
  'Δείτε: https://scam1.xyz https://scam2.ru https://scam3.top https://scam4.click',
  'ΕΠΙΚΙΝΔΥΝΟ', { scoreMin: 61 })

// ── GROUP 2: Ύποπτα ───────────────────────────────────────────────────────────
console.log('\n▸ ΥΠΟΠΤΑ (score 31-60)')

test('ΑΑΔΕ brand + urgency χωρίς link',
  'ΑΑΔΕ: Επικοινωνήστε αμέσως. Εκκρεμεί φόρος.',
  'ΥΠΟΠΤΟ', { scoreMin: 30 })

test('Ύποπτο TLD χωρίς credentials',
  'Δείτε την προσφορά μας: https://bestdeals.xyz/summer',
  'ΥΠΟΠΤΟ') // unknown domain (20) + suspicious TLD (10) = 30 → threshold

test('Reward bait + urgency (χωρίς link)',
  'Συγχαρητήρια! Κερδίσατε δώρο 1000€. Επικοινωνήστε αμέσως.',
  'ΥΠΟΠΤΟ')

test('IP address URL — ύποπτο link χωρίς credentials',
  'Επαλήθευση απαιτείται: http://45.33.32.156/info',
  'ΥΠΟΠΤΟ')

test('Ύποπτο email με brand + .ru',
  'Για επαλήθευση επικοινωνήστε: support@nbg-secure.ru',
  'ΕΠΙΚΙΝΔΥΝΟ')

// ── GROUP 3: Χαμηλός κίνδυνος ────────────────────────────────────────────────
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

// ── GROUP 4: Edge cases & normalization ───────────────────────────────────────
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

// ── SUMMARY ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Αποτέλεσμα: ${passed}/${total} passed${failed > 0 ? ` — ${failed} FAILED` : ' — ALL PASS ✅'}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
