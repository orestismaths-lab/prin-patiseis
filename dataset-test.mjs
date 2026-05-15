// Dataset test runner — loads scam-message-dataset.json and runs all 68 cases
// through an inline port of the scam engine that supports defanged URLs.
// Run with: node dataset-test.mjs

import { readFileSync } from 'fs'

const dataset = JSON.parse(readFileSync('./scam-message-dataset.json', 'utf8'))

// ── Inline engine (mirrors src/lib/*) ────────────────────────────────────────

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function refangUrl(text) {
  return text.replace(/hxxps?:\/\//gi, 'https://').replace(/\[\.\]/g, '.')
}

function hasDefangedLink(text) {
  return /hxxps?:\/\//i.test(text) || /\[\.\]/i.test(text)
}

function extractUrls(text) {
  const analyzed = refangUrl(text)
  const real = analyzed.match(/https?:\/\/[^\s<>"'()[\]{}]+/gi) ?? []
  return [...new Set(real)]
}

function extractDomains(text) {
  const analyzed = refangUrl(text)
  const urls = extractUrls(analyzed)
  const domains = []
  for (const url of urls) {
    try { const { hostname } = new URL(url); if (hostname) domains.push(hostname.toLowerCase()) } catch {}
  }
  const bare = analyzed.match(/\b([a-z0-9][-a-z0-9]{0,62}\.(?:gr|com|net|org|info|ru|xyz|tk|top|click|online|site|shop|live|eu|io|vip|icu|support|cc|digital|network|invalid))\b/gi) ?? []
  for (const d of bare) domains.push(d.toLowerCase())
  return [...new Set(domains)]
}

function hasLink(text) {
  return /https?:\/\//i.test(refangUrl(text)) || /\bwww\./i.test(text) || hasDefangedLink(text) || extractDomains(text).length > 0
}

// Strip URLs before keyword matching — URL paths/domains shouldn't drive keyword signals
function textOnly(text) {
  return refangUrl(text).replace(/https?:\/\/[^\s]+/gi, ' ')
}

function hasShortenerUrl(text) {
  return /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|rb\.gy)\b/i.test(refangUrl(text))
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

function containsAny(text, words) { const n = norm(text); return words.some(w => n.includes(norm(w))) }
function countMatches(text, words) { const n = norm(text); return words.filter(w => n.includes(norm(w))).length }
function brandDomainPresent(detected, brandDomains) {
  if (!brandDomains.length) return false
  return detected.some(d => brandDomains.some(bd => d === bd || d.endsWith('.' + bd)))
}

const KNOWN = [
  'gov.gr','aade.gr','myaade.gov.gr','efka.gov.gr','minedu.gov.gr','ypes.gov.gr',
  'elta.gr','dei.gr','deddie.gr','desfa.gr','eurobank.gr','alpha.gr','nbg.gr',
  'piraeusbank.gr','winbank.gr','eurobank.com.gr','cosmote.gr','wind.gr','vodafone.gr',
  'nova.gr','taxisnet.gov.gr','e-efka.gov.gr',
  'eopyy.gov.gr','fuelpass.gov.gr','powerpass.gov.gr','epass.gov.gr',
  'yme.gov.gr','netflix.com','amazon.com','amazon.co.uk',
  'microsoft.com','apple.com','icloud.com',
  'fedex.com','dhl.com','ups.com','skroutz.gr','e-shop.gr','public.gr',
]
function isKnown(d) { const l = d.toLowerCase(); return KNOWN.some(k => l === k || l.endsWith('.' + k)) }

const MANUAL_PHISHING = ['myaade-gr.ru','aade-online.xyz','elta-tracking.top','dei-payment.click','efka-online.site']
function isPhishing(d) { return MANUAL_PHISHING.some(p => d === p || d.endsWith('.' + p)) }

const URGENCY = ['αμεσα','αμεσως','επειγον','τωρα','σημερα','εντος','24 ωρες','48 ωρες','12 ωρες','ληγει','λιγει','απαιτειται','αμελλητι','urgent','immediately','expire','expires','deadline','εκπνοη','εκπνεει','τελευταια ευκαιρια','προθεσμια','καταληκτικη','αμεση δραση','αμεση ενεργεια','εντος 24','εντος 12','λιγει σημερα','ληγει σημερα']
const FEAR = ['αποκλεισμος','απενεργοποιηση','αναστολη','παγωμενος','μπλοκαρε','blocked','suspended','disabled','κλειδωμα','κλειδωθηκε','διαγραφη','απαγορευση','παραβιαση','unauthorized','illegal','παρανομη','ιος','μολυνθηκε','μολυνση','χακαρ','hacked','επιθεση','κινδυνος','διαρροη','κλεψιμο','κλεφτης','κλεφτες','διακοπη','φραγη','περιορισμος','θα περιοριστει','θα ληξει','υποπτη δραστηριοτητα','υποπτη συναλλαγη','νεα συσκευη','αντικατασταση sim']
const CREDS = ['κωδικ','password','pin','otp','αριθμος καρτ','αριθμο καρτ','cvv','cvc','iban','τραπεζικ','στοιχει','επιβεβαιωσ','verification','verify','αριθμος λογαριασμ','αριθμο λογαριασμ','one-time','one time','αυθεντικοποιηση','2fa','sms code','username','αφμ','αμκα','αριθμο ταυτοτητας','αριθμος ταυτοτητας','ταυτοτητα','διαβατηριο','e-banking','ebanking','web banking','mobile banking','αριθμος καρτας','στοιχεια καρτας','στοιχεια λογαριασμου','συνδεθ','ταυτοποιησ','βαλε καρτ','βαλτε καρτ']
const PAYMENT = ['πληρωση','πληρωσε','πληρωστε','payment','pay','χρεωση','οφειλη','ληξιπροθεσμη','χρεος','εκκρεμοτητα','εκκρεμει','ποσο','ευρω','€','προστιμο','φορος','ανεξοφλητ','απληρωτ','διοδι','παραβαση','εισφορ','τελη','αντιτιμο','συνδρομη','τελος','κοστος','αποζημιωση','επιστροφη χρηματων','χρεωση αποστολης','τελη αποστολης','τελη τελωνειου','εξοδα αποστολης','τελος σταθμευσης','συνταξη','καρτ','κατάθεσ','καταθεσ']
const REWARD = ['κερδισ','κερδιζ','κερδη','νικητης','δωρο','prize','winner','congratulations','συγχαρητηρια','επιστροφη','επιστροφη φορου','refund','cashback','bonus','εκπληξη','δωρεαν','free','gift','επιδομα','αποζημιωση','φορολοταρια','voucher','επιδοτηση','χρηματοδοτηση','επιχορηγηση','επιστροφη φαρμακων','αποζημιωση φαρμακων','εγκριθηκε επιδομα','εγκριθηκε επιστροφη','λαβετε χρηματα','δικαιουστε','δικαιουσθε']

const BRANDS = [
  { name: 'ΑΑΔΕ / Εφορία', keywords: ['ααδε','aade','εφορια','taxisnet','myaade'], domains: ['aade.gr','myaade.gov.gr','taxisnet.gov.gr'] },
  { name: 'ΕΛΤΑ', keywords: ['ελτα','elta','ταχυδρομει','δεμα','parcel','τελωνει'], domains: ['elta.gr'] },
  { name: 'ΔΕΗ', keywords: ['δεη','dei','ρευμα','ηλεκτρικο'], domains: ['dei.gr','deddie.gr'] },
  { name: 'Eurobank', keywords: ['eurobank'], domains: ['eurobank.gr'] },
  { name: 'Alpha Bank', keywords: ['alpha bank','alphabank','a1pha'], domains: ['alpha.gr'] },
  { name: 'Εθνική Τράπεζα', keywords: ['nbg','εθνικη τραπεζα','national bank'], domains: ['nbg.gr'] },
  { name: 'Τράπεζα Πειραιώς', keywords: ['πειραιως','piraeus','winbank'], domains: ['piraeusbank.gr','winbank.gr'] },
  { name: 'Cosmote / e-pay', keywords: ['cosmote','e-pay','epay'], domains: ['cosmote.gr'] },
  { name: 'ΕΦΚΑ', keywords: ['εφκα','efka','e-εφκα','e-efka'], domains: ['efka.gov.gr','e-efka.gov.gr'] },
  { name: 'Ελληνική Αστυνομία', keywords: ['αστυνομια','police','ελληνικη αστυνομια'], domains: [] },
  { name: 'ΕΟΠΥΥ', keywords: ['εοπυυ','eopyy','ασφαλιστικη ικανοτητα','υγειονομικη'], domains: ['eopyy.gov.gr'] },
  { name: 'Fuel Pass / Power Pass', keywords: ['fuel pass','power pass','καυσιμ επιδομ'], domains: ['fuelpass.gov.gr','powerpass.gov.gr','epass.gov.gr'] },
  { name: 'Netflix', keywords: ['netflix'], domains: ['netflix.com'] },
  { name: 'Amazon', keywords: ['amazon','prime'], domains: ['amazon.com','amazon.co.uk'] },
  { name: 'Microsoft / Apple', keywords: ['microsoft','windows','apple support','icloud'], domains: ['microsoft.com','apple.com','icloud.com'] },
  { name: 'Τροχαία / ΥΜΕ', keywords: ['τροχαια','yme','υπ. μεταφορων','αδεια οδηγησης','κτεο','κλιση τροχαιας'], domains: ['yme.gov.gr'] },
  { name: 'Courier / Delivery', keywords: ['fedex','dhl','ups','boxnow','speedex','acs courier','γενικη ταχυδρομικη','courier'], domains: ['fedex.com','dhl.com','ups.com'] },
  { name: 'Δήμος / Parking', keywords: ['δημος','σταθμευση','τελος σταθμευσης','parkingpay'], domains: [] },
  { name: 'ePass / Διόδια', keywords: ['epass','e-pass','διοδια','τελη διελευσης','road fee'], domains: ['epass.gov.gr'] },
]

const SUSP_TLDS = ['.ru','.xyz','.tk','.top','.click','.online','.site','.shop','.live','.info','.vip','.icu','.support','.cc','.digital','.network','.invalid']
const REMOTE_TOOLS = ['anydesk','teamviewer','απομακρυσμεν','remote access','remote desktop','εργαλειο υποστηριξης','security tool','support tool']
const FAMILY_WORDS = ['μαμα','μπαμπα','γονεας','γονεις','αδελφε','αδελφη']
const NEW_NUMBER_WORDS = ['νεος αριθμος','νεο νουμερο','αλλαξα αριθμο','νεο τηλεφωνο','αλλαξα κινητο','εσπασε το κινητο']
const DO_NOT_CALL_WORDS = ['μην με παρεις','μη με παρεις','μην τηλεφωνησεις','μην καλεσεις','do not call']
const SEND_MONEY_WORDS = ['στειλε','μεταφορα χρηματων','εμβασμα','χρηματα τωρα','χρηματα αμεσα','πληρωμη εδω']
const TX_ALERT = ['εγκριθηκε','χρεωθηκε','πραγματοποιηθηκε','σε εξελιξη','authorized purchase','νεα συσκευη']
const CANCEL_LINK = ['ακυρωστε','ακυρωσ','δεν αναγνωριζετε','δεν εκανατε','δεν κανατε','cancel','αν δεν ειστε','δεν ειστε εσεις']
const INVEST_WORDS = ['εγγυημενη αποδοση','εγγυημενες αποδοσεις','επενδυστε','bitcoin','κρυπτονομισμ','forex','trading platform','επενδυτικη πλατφορμα','κλειδωμενα κερδη','φορο αναληψης']
const INVEST_RETURN_WORDS = ['%','αποδοση','κερδος','κερδη','κερδιζ']
const DOWNLOAD_WORDS = ['κατεβαστε','εγκαταστηστε','download','install','κατεβαστε εφαρμογη','κατεβαστε το εργαλειο','κατεβαστε το security']
const MULE_MONEY = ['μεταφορα χρηματων','μεταφορες χρηματων','transfer money','transfer agent','κατάθεσ','καταθεσ']
const MULE_REWARD = ['προμηθεια','κρατατε','κρατηστε','commission','10%','15%','20%']
const GREEKLISH_CREDS = ['karta','blokaristei','stoixeia','kodikos','pliroste','epivevaioste','sindetheite','sundethite','dema','telon','epistrofi','iban']
const PUBLIC_SERVICE = ['τροχαια','παραβαση','κλιση τροχαιας','αδεια οδηγησης','δημος','σταθμευση','τελωνειο','govpay','gov-pay','υπ. μεταφορων','κτεο']
const PARCEL_WORDS = ['δεμα','παραδοση','parcel','αποδεσμευση','αποστολης','επαναπρογραμματισμο','τελωνεια','τελωνειο','customs']
const GUARANTEED = ['εγγυημενη αποδοση','εγγυημενο κερδος','guaranteed return','guaranteed profit']

function analyzeText(text) {
  const analyzed = refangUrl(text)
  const clean = textOnly(text)  // URLs stripped — used for keyword matching only
  const signals = []; let totalScore = 0
  const domains = extractDomains(text)
  const phones = extractPhoneNumbers(text)
  const msgHasLink = hasLink(text)
  const unknownDomains = domains.filter(d => !isKnown(d))
  const knownDomains = domains.filter(d => isKnown(d))

  // 0. Known phishing
  const knownPhishing = domains.filter(isPhishing)
  if (knownPhishing.length > 0) { add(signals, 'Γνωστό phishing domain', 50); totalScore += 50 }

  // 1. Defanged link
  if (hasDefangedLink(text)) { add(signals, 'Defanged σύνδεσμος (hxxps/[.])', 12); totalScore += 12 }

  // 2. URL shortener
  if (hasShortenerUrl(text)) { add(signals, 'Σύντομος σύνδεσμος (bit.ly)', 20); totalScore += 20 }

  // 3. Unknown domains
  if (unknownDomains.length > 0) { const s = Math.min(unknownDomains.length * 20, 40); add(signals, 'Ύποπτο domain', s, unknownDomains.join(', ')); totalScore += s }

  // 4. Urgency
  const uc = countMatches(clean, URGENCY); if (uc > 0) { const s = Math.min(uc*8,20); add(signals,'Επείγον',s); totalScore += s }

  // 5. Fear
  const fc = countMatches(clean, FEAR); if (fc > 0) { const s = Math.min(fc*10,25); add(signals,'Φόβος/αποκλεισμός',s); totalScore += s }

  // 6. Credentials
  const cc = countMatches(clean, CREDS); if (cc > 0) { const s = Math.min(cc*12,30); add(signals,'Κωδικοί/στοιχεία',s); totalScore += s }

  // 7. Payment
  const pc = countMatches(clean, PAYMENT); if (pc > 0) { const s = Math.min(pc*7,20); add(signals,'Πληρωμή',s); totalScore += s }

  // 8. Reward
  const rc = countMatches(clean, REWARD); if (rc > 0) { const s = Math.min(rc*10,25); add(signals,'Δώρο/επίδομα/επιστροφή',s); totalScore += s }

  // 9. Brand impersonation — check text AND domain names (typosquatting puts brand in domain)
  const domainsStr = domains.join(' ')
  for (const { name, keywords, domains: bd } of BRANDS) {
    if ((containsAny(clean, keywords) || containsAny(domainsStr, keywords)) && !brandDomainPresent(domains, bd)) {
      const s = unknownDomains.length > 0 ? 35 : 15
      add(signals, `Παρουσίαση ως ${name}`, s); totalScore += s
    }
  }

  // 10. Suspicious email
  const emails = (analyzed.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []).filter(e => !isKnown(e.split('@')[1] ?? ''))
  if (emails.length > 0) { add(signals,'Ύποπτο email',15); totalScore += 15 }

  // 11. IP URL
  const ipMatch = analyzed.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i)
  if (ipMatch) { add(signals,'IP URL',25); totalScore += 25 }

  // 12. Suspicious TLDs
  const suspTld = domains.filter(d => SUSP_TLDS.some(t => d.endsWith(t)))
  if (suspTld.length > 0) { const s = Math.min(suspTld.length*10,30); add(signals,'Ύποπτο TLD',s); totalScore += s }

  // 13. Premium phones
  const premium = phones.filter(isPremiumRatePhone)
  if (premium.length > 0) { add(signals,'Premium rate phone',30); totalScore += 30 }

  // 14. Remote access
  if (containsAny(clean, REMOTE_TOOLS)) { add(signals,'Απομακρυσμένη πρόσβαση',50); totalScore += 50 }

  // 15. Family emergency
  if (containsAny(clean, FAMILY_WORDS) && (containsAny(clean, NEW_NUMBER_WORDS) || containsAny(clean, DO_NOT_CALL_WORDS) || containsAny(clean, SEND_MONEY_WORDS))) {
    const alsoMoney = containsAny(clean, ['€','ευρω','χρηματα','εμβασμα','μεταφορα'])
    const s = alsoMoney ? 55 : 30; add(signals,'Οικογενειακή απάτη',s); totalScore += s
  }

  // 16. Fake transaction alert
  if (containsAny(clean, TX_ALERT) && containsAny(clean, CANCEL_LINK) && msgHasLink) { add(signals,'Ψεύτικη ειδοποίηση συναλλαγής',40); totalScore += 40 }

  // 17. Investment
  const ic = countMatches(clean, INVEST_WORDS)
  if (ic >= 1 && containsAny(clean, INVEST_RETURN_WORDS)) { const s = ic >= 2 ? 55 : 35; add(signals,'Επενδυτική απάτη',s); totalScore += s }

  // 18. Download app
  if (containsAny(clean, DOWNLOAD_WORDS) && msgHasLink) { add(signals,'Εγκατάσταση εφαρμογής',35); totalScore += 35 }

  // 19. Money mule
  if (containsAny(clean, MULE_MONEY) && containsAny(clean, MULE_REWARD)) { add(signals,'Money mule',50); totalScore += 50 }

  // 20. Greeklish
  if (containsAny(clean, GREEKLISH_CREDS) && msgHasLink) { add(signals,'Greeklish + σύνδεσμος',25); totalScore += 25 }

  // Hard rules
  if (msgHasLink && containsAny(clean, CREDS)) totalScore = Math.max(totalScore, 70)
  if (signals.some(s => s.includes('Παρουσίαση')) && unknownDomains.length > 0 && containsAny(clean, [...PAYMENT,...URGENCY,...REWARD])) totalScore = Math.max(totalScore, 70)
  // (no generic defanged hard rule — it over-alarmed on job/wrong-number openers)
  if (containsAny(clean, PUBLIC_SERVICE) && msgHasLink && containsAny(clean, PAYMENT)) totalScore = Math.max(totalScore, 70)
  if (containsAny(clean, PARCEL_WORDS) && msgHasLink && /[123456789][.,]\d{2}\s*€/.test(text)) totalScore = Math.max(totalScore, 70)
  if (containsAny(clean, ['anydesk','teamviewer']) && containsAny(clean, ['κωδικ','pin','otp'])) totalScore = Math.max(totalScore, 80)
  if (containsAny(clean, GUARANTEED)) totalScore = Math.max(totalScore, 70)

  totalScore = Math.min(totalScore, 100)
  const level = totalScore >= 60 ? 'dangerous' : totalScore >= 30 ? 'suspicious' : 'low'
  return { level, totalScore, signals }
}

function add(arr, label, score, detail) { arr.push(detail ? `${label}(${score})[${detail}]` : `${label}(${score})`) }

// ── Run all dataset cases ─────────────────────────────────────────────────────

let passed = 0, failed = 0
const failures = []

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Dataset test — scam-message-dataset.json')
console.log(`  ${dataset.totalCases} cases | language: ${dataset.language.join(', ')}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

for (const c of dataset.cases) {
  const r = analyzeText(c.message)
  const ok = r.level === c.expectedRisk
  if (ok) {
    passed++
    console.log(`  ✅  [${c.id}] → ${r.level.toUpperCase()} (${r.totalScore})`)
  } else {
    failed++
    failures.push({ id: c.id, expected: c.expectedRisk, got: r.level, score: r.totalScore, signals: r.signals, msg: c.message.slice(0, 80) })
    console.log(`  ❌  [${c.id}] expected ${c.expectedRisk.toUpperCase()} | got ${r.level.toUpperCase()} (${r.totalScore})`)
    console.log(`       ${c.message.slice(0, 100)}`)
    console.log(`       signals: ${r.signals.join(', ')}`)
  }
}

const total = passed + failed
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Result: ${passed}/${total} passed — ${failed} failed`)
if (failures.length > 0) {
  console.log('\n  FAILURES SUMMARY:')
  for (const f of failures) {
    console.log(`    ${f.id}: expected=${f.expected} got=${f.got}(${f.score})`)
  }
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
