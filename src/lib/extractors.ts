export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'()[\]{}]+/gi
  return [...new Set(text.match(urlRegex) ?? [])]
}

export function extractDomains(text: string): string[] {
  const urls = extractUrls(text)
  const domains: string[] = []

  for (const url of urls) {
    try {
      const { hostname } = new URL(url)
      if (hostname) domains.push(hostname.toLowerCase())
    } catch {
      // malformed URL — skip
    }
  }

  // Also catch bare domains not preceded by http (e.g. "επισκεφθείτε: myaade-gr.ru")
  const bareDomainRegex = /\b([a-z0-9][-a-z0-9]{0,62}\.(?:gr|com|net|org|info|ru|xyz|tk|top|click|online|site|shop|live|eu|io))\b/gi
  const bareMatches = text.match(bareDomainRegex) ?? []
  for (const d of bareMatches) {
    domains.push(d.toLowerCase())
  }

  return [...new Set(domains)]
}

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  return [...new Set(text.match(emailRegex) ?? [])]
}

export function hasLink(text: string): boolean {
  return /https?:\/\//i.test(text) || /\bwww\./i.test(text) || extractDomains(text).length > 0
}

// Greek phone numbers: mobile (6xx), landline (2xx), premium (901/909)
// Accepts optional +30/0030 prefix, digits may be separated by spaces or hyphens
export function extractPhoneNumbers(text: string): string[] {
  const re = /(?:\+30|0030)?[ -]?(?:6\d{2}|2\d{2}|90[19]\d)[ -]?\d{3}[ -]?\d{3,4}/g
  return [...new Set(text.match(re) ?? [])].map((p) => p.trim())
}

export function isPremiumRatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('30') && digits.length > 10 ? digits.slice(2) : digits
  return local.startsWith('901') || local.startsWith('909')
}
