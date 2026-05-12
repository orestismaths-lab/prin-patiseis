// Legacy sync helper — used only in extractors where async is not possible.
// The authoritative list is now config/scam-config.json (loaded via configLoader).

export const KNOWN_LEGITIMATE_DOMAINS: string[] = [
  // Government
  'gov.gr', 'aade.gr', 'myaade.gov.gr', 'efka.gov.gr', 'minedu.gov.gr', 'ypes.gov.gr',
  // Postal
  'elta.gr',
  // Utilities
  'dei.gr', 'deddie.gr', 'desfa.gr',
  // Banks
  'eurobank.gr', 'alpha.gr', 'nbg.gr', 'piraeusbank.gr', 'winbank.gr', 'eurobank.com.gr',
  // Telecoms
  'cosmote.gr', 'wind.gr', 'vodafone.gr', 'nova.gr',
  // Other
  'taxisnet.gov.gr', 'e-efka.gov.gr',
]

export function isKnownDomain(domain: string): boolean {
  const lower = domain.toLowerCase()
  return KNOWN_LEGITIMATE_DOMAINS.some(
    (known) => lower === known || lower.endsWith('.' + known)
  )
}
