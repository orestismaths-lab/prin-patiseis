import { analyzeText } from '@/lib/scamEngine'

const messages = [
  { id: 'stoiximan',       text: 'ΕΩΣ 150€ ΣΕ FREE BET ΕΙΝΑΙ ΔΙΑΘΕΣΙΜΟ ΜΕ ΤΗΝ ΕΠΟΜΕΝΗ ΚΑΤΆΘΕΣΗ ΜΕΧΡΙ ΤΟ ΤΕΛΟΣ ΤΗΣ ΗΜΕΡΑΣ. ΑΠΕΓΓΡΑΦΗ https://www.stoiximan.gr/myaccount/unsubscribe?channel=sms' },
  { id: 'idika',           text: 'ΠΡΟΓΡΑΜΜΑ ΠΡΟΛΑΜΒΑΝΩ ΑΠΟ ΤΟ ΥΠΟΥΡΓΕΙΟ ΥΓΕΙΑΣ. ΤΟ ΠΑΡΑΠΕΜΠΤΙΚΟ ΣΑΣ ΓΙΑ ΤΟΝ ΑΜΚΑ 150179***33 ΕΧΕΙ ΠΑΡΕΙ ΠΑΡΑΤΑΣΗ ΕΩΣ 31/03/2026. ΠΛΗΡΟΦΟΡΙΕΣ ΣΤΟ cardio.gov.gr' },
  { id: 'cutmyhair',       text: 'ΣΑΣ ΥΠΕΝΘΥΜΙΖΟΥΜΕ ΤΟ ΡΑΝΤΕΒΟΥ ΜΑΣ ΠΕΜΠΤΗ 27/3 ΚΑΙ ΩΡΑ 19:30. ΓΙΑ ΟΠΟΙΑ ΑΛΛΑΓΗ, ΠΑΡΑΚΑΛΩ ΚΑΛΕΣΤΕ 2106813015 @CutMyHair ΑΝ.ΠΑΠΑΝΔΡΕΟΥ 85-87' },
  { id: 'cosmote-bill',    text: 'Ο ΛΟΓΑΡΙΑΣΜΟΣ ΜΑΪΟΥ 35,90€ ΛΗΓΕΙ ΣΤΙΣ 05/06/2026. ΔΙΑΘΕΣΙΜΟΣ ΣΤΟ https://e-bill.cosmote.gr/web/guest/ebill-tab-1?token=MS-7OYIN ΚΩΔ. ΠΛΗΡΩΜΗΣ RF84903. ΔΩΡΟ 5GB ΜΕ ΠΛΗΡΩΜΗ ΣΤΟ COSMOTE APP https://cosmote.go.link/openBills' },
  { id: 'cosmote-refund',  text: 'ΣΕ ΣΥΝΕΧΕΙΑ ΤΗΣ ΕΠΙΚΟΙΝΩΝΙΑΣ ΜΑΣ, ΣΑΣ ΕΝΗΜΕΡΩΝΟΥΜΕ ΟΤΙ ΘΑ ΣΑΣ ΕΠΙΣΤΡΑΦΕΙ ΤΟ ΠΟΣΟ 28.64€ ΠΡΟ ΦΠΑ ΣΤΟΝ ΕΠΟΜΕΝΟ ΛΟΓΑΡΙΑΣΜΟ. ΠΑΡΑΜΕΝΟΥΜΕ ΣΤΗ ΔΙΑΘΕΣΗ ΣΑΣ.' },
  { id: 'cosmote-esim',    text: 'Η ΥΠΗΡΕΣΙΑ MultiSIM ΕΝΕΡΓΟΠΟΙΗΘΗΚΕ ΓΙΑ ΤΟ 6974908918 ΚΑΙ ΑΠΟ ΤΗΝ ΚΑΡΤΑ eSIM 89300100241029265698 multiSIM Green. ΓΙΑ ΝΑ ΕΓΚΑΤΑΣΤΗΣΕΤΕ ΤΗΝ eSIM ΑΚΟΛΟΥΘΗΣΤΕ ΤΙΣ ΟΔΗΓΙΕΣ ΕΓΚΑΤΑΣΤΑΣΗΣ ΠΟΥ ΘΑ ΒΡΕΙΤΕ ΕΙΤΕ ΣΤΗΝ ΕΠΙΣΤΟΛΗ ΠΟΥ ΠΗΡΑΤΕ ΑΠΟ ΤΟ ΚΑΤΑΣΤΗΜΑ.' },
  { id: 'box-order',       text: 'Η παραγγελία σου (κωδ. 9DFEA17839C5) ετοιμάζεται στο κατάστημα SIMPLY BURGERS. Έχεις διαλέξει πληρωμή με κάρτα και το συνολικό ποσό είναι 17.38 €. Με την παραγγελία σου κέρδισες 2250 πόντους.' },
  { id: 'box-loyalty',     text: '2,04€ σε πόντους BOX σε περιμένουν. Παράγγειλε και κέρδισε εκπτώσεις εξαργυρώνοντας τους πόντους σου! https://box.go.link/app' },
  { id: 'cosmote-review',  text: 'Η ΟΜΑΔΑ ΤΟΥ COSMOTE INSURANCE ΕΙΜΑΣΤΕ ΠΑΝΤΑ ΔΙΠΛΑ ΣΟΥ ΣΤΟ 2108018000, 24 ΩΡΕΣ ΤΟ 24ΩΡΟ. ΘΑ ΕΚΤΙΜΟΥΣΑΜΕ ΝΑ ΜΑΣ ΑΞΙΟΛΟΓΗΣΕΙΣ ΣΤΗ GOOGLE. https://g.page/r/CUbqMCRIoeSuEAE/review' },
  { id: 'cosmote-contract', text: 'ΓΙΑ ΤΗΝ ΨΗΦΙΑΚΗ ΥΠΟΓΡΑΦΗ ΤΗΣ ΣΥΜΒΑΣΗΣ ΣΟΥ ΣΤΗΝ COSMOTE, ΑΚΟΛΟΥΘΗΣΕ ΤΟ LINK https://www.cosmote.gr/contract/consent?order=oxQ5XZWgCr9hIlRgE. ΣΕ ΠΕΡΙΠΤΩΣΗ ΠΟΥ Η ΔΙΑΔΙΚΑΣΙΑ ΔΕΝ ΟΛΟΚΛΗΡΩΘΕΙ ΕΝΤΟΣ 24 ΩΡΩΝ, Η ΠΑΡΑΓΓΕΛΙΑ ΣΟΥ ΘΑ ΑΚΥΡΩΘΕΙ.' },
  { id: 'cosmote-ins-pay', text: 'COSMOTE INSURANCE: ΕΞΟΦΛΗΣΕΤΕ ΤΟ ΠΟΣΟ 151.98€ ΓΙΑ ΤΟ ΟΧΗΜΑ ΒΚΒ1087 ΠΑΤΩΝΤΑΣ ΕΔΩ https://www.cosmoteinsurance.gr/payment?merchantRef=abc123 ΑΜΕΣΩΣ ΜΕΤΑ ΤΗΝ ΠΛΗΡΩΜΗ ΘΑ ΛΑΒΕΤΕ ΤΟ ΣΥΜΒΟΛΑΙΟ.' },
  { id: 'cosmote-sec',     text: 'ΤΟ COSMOTE MOBILE SECURITY ΣΥΝΕΧΙΖΕΙ ΝΑ ΠΡΟΣΤΑΤΕΥΕΙ ΤΟ ΚΙΝΗΤΟ ΣΑΣ ΑΠΟ ΙΟΥΣ & HACKERS! ΤΙΣ ΤΕΛΕΥΤΑΙΕΣ 30 ΗΜΕΡΕΣ ΕΧΟΥΜΕ ΑΠΟΚΛΕΙΣΕΙ 12.037 ONLINE ΑΠΕΙΛΕΣ. ΠΛΗΡΟΦΟΡΙΕΣ ΣΤΟ security.cosmote.gr' },
  // BOX coupon screenshots (2nd batch)
  { id: 'box-coupon-nolink',   text: 'Από την παραγγελία σου κέρδισες κουπόνι +1.000 πόντων με τον κωδικό PS2CKXB3NSNU. Για να λάβεις τους +1.000 πόντους, εξαργύρωσε το κουπόνι σου παραγγέλνοντας από το ίδιο κατάστημα μέχρι 13/07/2025. BOX. To delivery που πάντα κερδίζεις.' },
  { id: 'box-coupon-pagelink', text: 'Το κουπόνι σου PS2CKXB3NSNU λήγει αύριο (13-07-2025 23:59). Παράγγειλε τώρα για να μη το χάσεις! https://boxfood.page.link/JVVd' },
  { id: 'box-coupon-golink',   text: 'Το κουπόνι σου WAJ1KHL58KWL λήγει αύριο (16-01-2026 23:59). Παράγγειλε τώρα για να μη το χάσεις! https://box.go.link/JVVd' },
  { id: 'box-cosmote-coupon',  text: 'Το 2€ κουπόνι 4EHG1Y2H71 που κέρδισες για το Portofino λήγει αύριο (31-01-2026 23:59). Παράγγειλε τώρα για να μη το χάσεις! Και μην ξεχνάς! Μόνο με το BOX και την COSMOTE TELEKOM κερδίζεις ατελείωτα 2€ για κάθε παραγγελία, σε χιλιάδες καταστήματα!(https://box.go.link/JVVd)' },
]

for (const { id, text } of messages) {
  const r = analyzeText(text)
  const flag = r.riskLevel === 'low' ? '✅' : r.riskLevel === 'suspicious' ? '⚠️ ' : '🚨'
  process.stdout.write(flag + ' ' + r.riskLevel.padEnd(10) + ' (' + String(r.totalScore).padStart(3) + ')  [' + id + ']\n')
  if (r.riskLevel !== 'low') {
    process.stdout.write('      signals: ' + r.signals.map((s: { label: string; score: number }) => s.label.slice(0,38) + '(' + s.score + ')').join(', ') + '\n')
  }
}
