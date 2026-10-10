import { getStore } from '@netlify/blobs'
import { bearer, json, verifyToken } from './_auth'

/** İçerik paketi (.json) yükleme: packs deposuna id ile yazar. */
export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST bekleniyor' }, 405)
  const secret = process.env.ADMIN_PASSCODE
  if (!secret || !(await verifyToken(secret, bearer(req)))) return json({ error: 'Yetkisiz' }, 401)
  const pack = (await req.json().catch(() => null)) as { id?: string; version?: string; factors?: unknown[]; lists?: Record<string, unknown> } | null
  if (!pack?.id || (!pack.factors && !pack.lists)) return json({ error: 'Paket id ve factors[] veya lists{} gerekli' }, 400)
  const store = getStore('packs')
  await store.setJSON(pack.id, { ...pack, uploadedAt: new Date().toISOString() })
  return json({ ok: true, id: pack.id, factors: pack.factors?.length ?? 0, lists: Object.keys(pack.lists ?? {}).length })
}
