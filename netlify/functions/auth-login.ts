import { issueToken, json } from './_auth'

/**
 * İki rollü demo girişi. Kullanıcı adı rolü belirler, parola ilgili ortam değişkeniyle karşılaştırılır:
 *  - admin     → ADMIN_PASSCODE (token ADMIN_PASSCODE ile imzalanır; settings-put bunu kabul eder)
 *  - bilirkisi → USER_PASSCODE  (token USER_PASSCODE ile imzalanır; yönetici uç noktalarında geçersizdir)
 */
const ROLE_BY_USERNAME: Record<string, 'admin' | 'kullanici'> = { admin: 'admin', bilirkisi: 'kullanici' }

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST bekleniyor' }, 405)
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string }
  const uname = (username ?? '').trim().toLowerCase()
  const role = ROLE_BY_USERNAME[uname]
  if (!role || !password) return json({ error: 'Kullanıcı adı veya parola hatalı' }, 401)
  const secret = role === 'admin' ? process.env.ADMIN_PASSCODE : process.env.USER_PASSCODE
  if (!secret) return json({ error: role === 'admin' ? 'ADMIN_PASSCODE tanımlı değil' : 'USER_PASSCODE tanımlı değil' }, 500)
  if (password !== secret) return json({ error: 'Kullanıcı adı veya parola hatalı' }, 401)
  const token = await issueToken(secret, 12 * 60 * 60 * 1000, { sub: role, role, username: uname })
  return json({ token, role, username: uname, expiresIn: 43200 })
}
