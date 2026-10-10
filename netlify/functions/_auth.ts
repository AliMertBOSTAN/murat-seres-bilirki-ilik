/** HMAC imzalı kısa ömürlü yönetici token'ı (demo). Üretim: Netlify Identity / OIDC (ADR-004). */
const enc = new TextEncoder()
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret + '|seres-admin'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
export async function issueToken(secret: string, ttlMs = 2 * 60 * 60 * 1000): Promise<string> {
  const payload = b64(enc.encode(JSON.stringify({ sub: 'admin', exp: Date.now() + ttlMs })))
  const sig = b64(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(payload)))
  return `${payload}.${sig}`
}
export async function verifyToken(secret: string, token: string | null): Promise<boolean> {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64(sig), enc.encode(payload))
  if (!ok) return false
  try { const p = JSON.parse(new TextDecoder().decode(unb64(payload))) as { exp: number }; return p.exp > Date.now() } catch { return false }
}
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
export const bearer = (req: Request) => (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '') || null
