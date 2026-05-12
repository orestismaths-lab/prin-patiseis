import type { ScamConfig } from '@/types/scam'
import { DEFAULT_CONFIG } from '@/lib/defaultConfig'

const CONFIG_URL = '/config/scam-config.json'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let cached: ScamConfig | null = null
let cachedAt = 0

export async function loadConfig(): Promise<ScamConfig> {
  const now = Date.now()
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached

  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    cached = json as ScamConfig
    cachedAt = now
    return cached
  } catch {
    // Network failure or parse error — use bundled defaults
    return DEFAULT_CONFIG
  }
}
