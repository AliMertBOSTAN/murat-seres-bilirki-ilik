import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginRequest, type UserRole } from '@/lib/central'
import { useSettingsStore } from '@/store/settingsStore'

export { DEMO_USERS } from '@/lib/central'

export interface AuthUser { username: string; role: UserRole; token: string; loginAt: string }

interface AuthStore {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

/** Demo giriş kapısı: Netlify Function (`/api/auth-login`) → yoksa çevrimdışı DEMO_USERS. Oturum `seres-auth` anahtarında kalıcıdır. */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: async (username, password) => {
        const r = await loginRequest(username, password)
        if (!r) return false
        set({ user: { username: r.username, role: r.role, token: r.token, loginAt: new Date().toISOString() } })
        return true
      },
      logout: () => {
        set({ user: null })
        useSettingsStore.getState().setAdminToken(null)
      },
    }),
    { name: 'seres-auth', partialize: (s) => ({ user: s.user }) },
  ),
)
