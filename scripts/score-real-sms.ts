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
]

for (const { id, text } of messages) {
  const r = analyzeText(text)
  const flag = r.riskLevel === 'low' ? '✅' : r.riskLevel === 'suspicious' ? '⚠️ ' : '🚨'
  process.stdout.write(flag + ' ' + r.riskLevel.padEnd(10) + ' (' + String(r.totalScore).padStart(3) + ')  [' + id + ']\n')
  if (r.riskLevel !== 'low') {
    process.stdout.write('      signals: ' + r.signals.map((s: { label: string; score: number }) => s.label.slice(0,38) + '(' + s.score + ')').join(', ') + '\n')
  }
}
