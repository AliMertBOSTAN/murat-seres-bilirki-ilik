import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Field, TextInput } from '@/ui/primitives'

/** Tam ekran giriş kapısı: krem zemin, ortada kart, SB logosu üstte, TÜBİR altta. */
export function LoginPage() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const loc = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const from = (loc.state as { from?: string } | null)?.from
  const target = from && from !== '/giris' ? from : '/dosya/giris'

  if (user) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) { setErr('Kullanıcı adı ve parola gerekli.'); return }
    setBusy(true); setErr(null)
    const ok = await login(username, password)
    setBusy(false)
    if (ok) navigate(target, { replace: true })
    else setErr('Kullanıcı adı veya parola hatalı.')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-krem via-kagit to-altin-100/60 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="kart overflow-hidden">
          <div className="flex flex-col items-center gap-3 border-b border-krem-200 bg-kagit px-8 pt-8 pb-6 text-center">
            <img src="/brand/sb-bilirkisilik-adaletin-guvencesi.png" alt="SB Bilirkişilik — Adaletin Güvencesi" className="h-32 w-auto object-contain drop-shadow" />
            <div>
              <div className="font-display text-2xl font-semibold leading-none tracking-wide text-lacivert">SERESLER</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-altin">Bilirkişilik Sistemi</div>
            </div>
            <div className="hr-altin w-full" />
            <p className="text-xs text-gri">Devam etmek için kullanıcı adı ve parolanızla giriş yapın.</p>
          </div>
          <form className="space-y-4 px-8 py-6" onSubmit={(e) => void submit(e)} noValidate>
            <Field label="Kullanıcı adı"><TextInput name="username" autoComplete="username" autoFocus value={username} onChange={setUsername} placeholder="admin · bilirkisi" /></Field>
            <Field label="Parola"><TextInput name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} /></Field>
            {err && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Doğrulanıyor…' : 'Giriş'}</button>
            <p className="text-center text-[11px] text-gri">Demo hesapları: admin / seres · bilirkisi / seres123</p>
          </form>
          <div className="flex items-center justify-center gap-2 border-t border-krem-200 bg-krem/60 px-8 py-3">
            <img src="/brand/tubir.png" alt="TÜBİR" className="h-9 w-auto object-contain" />
            <span className="etiket">TÜBİR üyesi</span>
          </div>
        </div>
      </div>
    </div>
  )
}
