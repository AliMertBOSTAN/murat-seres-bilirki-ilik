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

/* ---------------- Kullanıcı girişi (iki rollü demo kapısı) ---------------- */
export type UserRole = 'admin' | 'kullanici'
export interface LoginResult { token: string; role: UserRole; username: string }

/** Çevrimdışı demo hesapları (Netlify Function erişilemezse). README › "Giriş ve roller". */
export const DEMO_USERS: readonly { username: string; password: string; role: UserRole }[] = [
  { username: 'admin', password: 'seres', role: 'admin' },
  { username: 'bilirkisi', password: 'seres123', role: 'kullanici' },
]

/** Önce `POST /api/auth-login`; Function yoksa (ağ hatası, 404, JSON olmayan yanıt) DEMO_USERS ile çevrimdışı doğrulama. 401 ise fallback yapılmaz. */
export async function loginRequest(username: string, password: string): Promise<LoginResult | null> {
  const uname = username.trim().toLowerCase()
  try {
    const r = await fetch(`${base}/auth-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: uname, password }) })
    const isJson = (r.headers.get('content-type') ?? '').includes('application/json')
    if (r.status === 401 && isJson) return null
    if (r.ok && isJson) {
      const j = (await r.json()) as Partial<LoginResult>
      if (j.token && j.role && j.username) return { token: j.token, role: j.role, username: j.username }
    }
  } catch { /* function yok (yerel statik önizleme) */ }
  const demo = DEMO_USERS.find((u) => u.username === uname && u.password === password)
  return demo ? { token: `local.${demo.role}.${Date.now()}`, role: demo.role, username: demo.username } : null
}
