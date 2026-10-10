import { issueToken, json } from './_auth'

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST bekleniyor' }, 405)
  const secret = process.env.ADMIN_PASSCODE
  if (!secret) return json({ error: 'ADMIN_PASSCODE tanımlı değil' }, 500)
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string }
  if (!passcode || passcode !== secret) return json({ error: 'Parola hatalı' }, 401)
  return json({ token: await issueToken(secret), expiresIn: 7200 })
}
