import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/** Oturum yoksa /giris'e yönlendirir; girişten sonra geri dönülecek yol `state.from` ile taşınır. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loc = useLocation()
  if (!user) return <Navigate to="/giris" replace state={{ from: `${loc.pathname}${loc.search}` }} />
  return <>{children}</>
}

/** Yalnız yönetici rolü; kullanıcı rolü kapak sayfasına uyarı ile döner. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'admin') return <Navigate to="/dosya/giris" replace state={{ warn: 'Ayarlar paneli yalnız yönetici rolüne açıktır.' }} />
  return <>{children}</>
}
