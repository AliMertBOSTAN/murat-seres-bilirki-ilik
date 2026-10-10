/** Merkezi Ayarlar (Netlify Functions + Blobs) istemcisi. Çevrimdışı/yerel geliştirmede nazikçe düşer. */
import type { Settings } from '@/store/settingsStore'

const base = '/api'

export async function adminLogin(passcode: string): Promise<string | null> {
  try {
    const r = await fetch(`${base}/auth-admin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode }) })
    if (r.ok) { const j = (await r.json()) as { token: string }; return j.token }
    if (r.status === 401) return null
  } catch { /* function yok (yerel statik önizleme) */ }
  // Çevrimdışı demo: yerel parola
  return passcode === 'seres' ? `local.${Date.now()}` : null
}

export async function pullCentralSettings(): Promise<Settings | null> {
  try { const r = await fetch(`${base}/settings-get`); if (!r.ok) return null; const j = (await r.json()) as { settings?: Settings }; return j.settings ?? null } catch { return null }
}

export async function pushCentralSettings(s: Settings, token: string): Promise<boolean> {
  try { const r = await fetch(`${base}/settings-put`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: s }) }); return r.ok } catch { return false }
}
