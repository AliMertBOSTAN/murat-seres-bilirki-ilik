import { getStore } from '@netlify/blobs'
import { bearer, json, verifyToken } from './_auth'

export default async (req: Request) => {
  if (req.method !== 'PUT' && req.method !== 'POST') return json({ error: 'PUT bekleniyor' }, 405)
  const secret = process.env.ADMIN_PASSCODE
  if (!secret || !(await verifyToken(secret, bearer(req)))) return json({ error: 'Yetkisiz' }, 401)
  const body = (await req.json().catch(() => null)) as { settings?: { version?: string; lastHash?: string } } | null
  if (!body?.settings) return json({ error: 'settings gerekli' }, 400)
  const store = getStore('settings')
  await store.setJSON('current', body.settings)
  await store.setJSON(`history/${Date.now()}-${body.settings.version ?? 'x'}`, { at: new Date().toISOString(), version: body.settings.version, hash: body.settings.lastHash })
  return json({ ok: true, version: body.settings.version, hash: body.settings.lastHash })
}
