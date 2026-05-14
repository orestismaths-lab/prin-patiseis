// Space-optimized Levenshtein distance
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

// Normalize a domain or domain fragment for comparison:
// removes subdomains (www/m/my/e/mail/login/portal/web/app), hyphens, dots — lowercases.
// "eurobank-secure.xyz" → "eurobanksecure"
// "my-aade-gr.ru"       → "myaadegr"
// "m.alpha-bank.gr"     → "alphabank"
export function domainCore(domain: string): string {
  const withoutTld = domain.replace(/\.[^.]+$/, '')
  const withoutPrefix = withoutTld.replace(/^(www|m|mail|my|secure|login|portal|e|web|app)\./i, '')
  return withoutPrefix.replace(/[.\-_]/g, '').toLowerCase()
}

// Extract the brand stem from a full domain string:
// "eurobank.gr"    → "eurobank"
// "piraeusbank.gr" → "piraeusbank"
// "myaade.gov.gr"  → "myaade"
export function brandStemFromDomain(domain: string): string {
  return domain.split('.')[0].replace(/[.\-_]/g, '').toLowerCase()
}

// Returns the matched stem if the core looks like it impersonates a known brand.
export function findImpersonatedBrand(core: string, brandStems: string[]): string | null {
  for (const stem of brandStems) {
    if (stem.length < 3) continue
    if (core.includes(stem)) return stem
    if (core.length >= stem.length - 1 && levenshtein(core, stem) <= 1) return stem
  }
  return null
}
