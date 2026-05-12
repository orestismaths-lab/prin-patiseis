# Πριν Πατήσεις — Project Overview

Greek mobile-first PWA that detects scam messages using browser-only OCR + a rule-based engine.
No AI API, no backend, no database, no user accounts.

**Live:** https://prin-patiseis.vercel.app  
**Repo:** https://github.com/orestismaths-lab/prin-patiseis

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.6, App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (config-less, tokens in globals.css) |
| OCR | Tesseract.js (`ell+eng`), browser-only, no server |
| Analysis | Rule-based scam engine, no AI |
| Deploy | Vercel (auto-deploy on push to main) |

---

## Key Files

```
src/
├── app/page.tsx              # 5 stages: idle | ocr | manual | done | error
├── components/
│   ├── ImagePicker.tsx       # Single button: file picker (on mobile = camera + gallery)
│   └── ResultCard.tsx        # Risk display with signals, domains, actions
├── lib/
│   ├── scamEngine.ts         # Core scoring engine (accepts ScamConfig)
│   ├── configLoader.ts       # Fetches /config/scam-config.json, 6h cache, fallback
│   ├── defaultConfig.ts      # Bundled fallback config (same shape as JSON)
│   ├── extractors.ts         # extractDomains, extractEmails, hasLink
│   ├── domainRegistry.ts     # Sync legacy helper for extractors
│   └── ocr.ts                # Tesseract worker, two-phase progress (1-30% load, 30-100% recog)
├── types/scam.ts             # ScamResult, ScamSignal, ScamConfig, RiskLevel
config/
└── scam-config.json          # Remote config — auto-updated by GitHub Actions daily
.github/workflows/
└── update-feeds.yml          # Daily fetch from OpenPhish + URLhaus → commit JSON
```

---

## Scam Engine

### Scoring signals (with caps)

| # | Signal | Points |
|---|---|---|
| 0 | Known phishing domain (from feeds) | +50 |
| 1 | Unknown / suspicious domain | +20 each, cap 40 |
| 2 | Urgency words | +8 each, cap 20 |
| 3 | Fear / blocked-account language | +10 each, cap 25 |
| 4 | Credential/PIN/OTP request | +12 each, cap 30 |
| 5 | Payment words | +7 each, cap 20 |
| 6 | Reward / prize / refund bait | +10 each, cap 25 |
| 7 | Brand impersonation (per-brand domain check) | +15 |
| 8 | Suspicious email sender | +15 |
| 9 | IP-address URL | +25 |
| 10 | Suspicious TLD (.ru .xyz .tk etc) | +10 each, cap 30 |

**Hard rule:** link present + credential words → score forced to ≥ 70  
**Total cap:** 100

### Risk thresholds
- `dangerous` ≥ 60
- `suspicious` ≥ 30
- `low` < 30

### Greek normalization
```ts
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
```
Handles accented OCR output and ALL_CAPS input. Keywords use stems to cover Greek declension (e.g. `κωδικ` matches κωδικός / κωδικό / κωδικοί).

---

## Remote Config System

**`config/scam-config.json`** is fetched at runtime with a 6-hour in-memory cache. On fetch failure, `defaultConfig.ts` (bundled copy) is used as fallback.

The JSON contains all keyword lists, brand definitions, legitimate domains, and the `phishingDomains` array that is auto-updated by GitHub Actions.

### GitHub Actions (`update-feeds.yml`)
- Runs daily at 04:00 UTC (+ manual trigger)
- Sources: **OpenPhish** (plain text) + **URLhaus** (text_online)
- Filters to `.gr` + suspicious TLDs, caps at 500 domains
- Merges with existing `phishingDomains`, bumps `_meta.version`, commits with `[skip ci]`
- Vercel auto-deploys the new JSON → next browser fetch picks it up

**Manual overrides:** `manualPhishingDomains` in the JSON is never touched by the bot.

---

## Image Input

Single button in `ImagePicker.tsx` triggers a native `<input type="file" accept="image/*">`. On mobile this opens the system picker with both camera and gallery options. No custom WebcamModal needed.

Blob URL lifecycle: `URL.revokeObjectURL(prev)` called on every new selection and on clear to prevent memory leaks.

---

## QA Tests

`qa-test.mjs` — 24 test cases (node, dev only). Run with `node qa-test.mjs`.  
All 24 pass. Tests cover: dangerous/suspicious/low classification, OCR normalization, Greek declined forms, brand impersonation, score cap, threshold boundaries, IP URLs, phishing domains.

---

## Deployment

Vercel project linked to `orestismaths-lab/prin-patiseis`. Push to `main` → auto-deploy.  
GitHub Actions needs no secrets — it commits back to the repo using the default `GITHUB_TOKEN`.
