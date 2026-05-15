// Normalize defanged URLs: hxxps:// → https://, [.] → .
// Returns a version safe for analysis only — never rendered as clickable links.
export function refangUrl(text: string): string {
  return text
    .replace(/hxxps?:\/\//gi, 'https://')
    .replace(/\[\.\]/g, '.')
}

export function hasDefangedLink(text: string): boolean {
  return /hxxps?:\/\//i.test(text) || /\[\.\]/i.test(text)
}

export function extractUrls(text: string): string[] {
  // Match real and defanged URLs
  const real = text.match(/https?:\/\/[^\s<>"'()[\]{}]+/gi) ?? []
  const defanged = text.match(/hxxps?:\/\/[^\s<>"'(){}]+/gi) ?? []
  const normalized = defanged.map((u) => refangUrl(u))
  return [...new Set([...real, ...normalized])]
}

export function extractDomains(text: string): string[] {
  // Analyze both original and defanged text
  const analyzed = refangUrl(text)
  const urls = extractUrls(analyzed)
  const domains: string[] = []

  for (const url of urls) {
    try {
      const { hostname } = new URL(url)
      if (hostname) domains.push(hostname.toLowerCase())
    } catch {
      // malformed URL — skip
    }
  }

  // Bare domains not preceded by http (e.g. "επισκεφθείτε: myaade-gr.ru")
  const bareDomainRegex = /\b([a-z0-9][-a-z0-9]{0,62}\.(?:gr|com|net|org|info|ru|xyz|tk|top|click|online|site|shop|live|eu|io|vip|icu|support|cc|digital|network|invalid))\b/gi
  for (const d of (analyzed.match(bareDomainRegex) ?? [])) {
    domains.push(d.toLowerCase())
  }

  return [...new Set(domains)]
}

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  return [...new Set(text.match(emailRegex) ?? [])]
}

export function hasLink(text: string): boolean {
  return /https?:\/\//i.test(text)
    || /hxxps?:\/\//i.test(text)
    || /\bwww\./i.test(text)
    || hasDefangedLink(text)
    || extractDomains(text).length > 0
}

// Detect URL shorteners (bit.ly, tinyurl, etc.) in both real and defanged form
export function hasShortenerUrl(text: string): boolean {
  return /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rb\.gy)\b/i.test(refangUrl(text))
}

// Greek phone numbers: mobile (6xx), landline (2xx), premium (901/909)
export function extractPhoneNumbers(text: string): string[] {
  const re = /(?:\+30|0030)?[ -]?(?:6\d{2}|2\d{2}|90[19]\d)[ -]?\d{3}[ -]?\d{3,4}/g
  return [...new Set(text.match(re) ?? [])].map((p) => p.trim())
}

export function isPremiumRatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('30') && digits.length > 10 ? digits.slice(2) : digits
  return local.startsWith('901') || local.startsWith('909')
}

// Monetary amounts like 1,99€  489,00€  1.500€
export function extractAmounts(text: string): string[] {
  const re = /\d{1,4}(?:[.,]\d{2,3})*\s*€/g
  return [...new Set(text.match(re) ?? [])]
}
