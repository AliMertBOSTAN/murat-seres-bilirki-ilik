import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSummary } from '@/engine/selectors'
import { GROUP_TITLES } from '@/content'
import { formatDateTR } from '@/engine/excel-compat'
import { MODULES } from '@/modules/registry'
import { cn } from '@/ui/cn'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { listCases, loadCaseById } from '@/store/db'

interface NavItem { to: string; label: string; sheet?: string; badge?: string }
interface NavGroup { title: string; items: NavItem[] }

export function AppShell() {
  const c = useCaseStore((s) => s.caseData)
  const settings = useSettingsStore((s) => s.settings)
  const summary = useSummary()
  const loc = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => { setNavOpen(false) }, [loc.pathname])
  useEffect(() => {
    const last = localStorage.getItem('seres-last-case')
    if (last && last !== useCaseStore.getState().caseData.id) void loadCaseById(last).then((cc) => { if (cc) useCaseStore.getState().loadCase(cc) })
    else void listCases()
  }, [])

  const entityNav = (kind: 'araclar' | 'suruculer' | 'yolcular' | 'yayalar', base: string, label: string, sheet: string): NavItem => ({ to: `${base}/1`, label: `${label} (${Math.max(1, c[kind].length)})`, sheet })
  const groups: NavGroup[] = [
    { title: 'Dosya', items: [{ to: '/dosya/giris', label: 'Giriş · Kapak', sheet: 'Giriş' }, { to: '/dosya/veri', label: 'Veri Girişi', sheet: 'Grş 1' }] },
    { title: 'Rapor', items: [
      { to: '/rapor/aciklamalar', label: '1. Açıklamalar', sheet: '1.' },
      { to: '/analiz/yer-istatistik', label: '2. Yer, Zaman ve İstatistik', sheet: '2.' },
      { to: '/analiz/yol-cevre', label: '3. Yol ve Çevre', sheet: '3' },
      { to: '/sonuc', label: 'Sonuç Özeti', sheet: 'sonuç1' },
      entityNav('araclar', '/analiz/arac', '4. Araç', '4'),
      entityNav('suruculer', '/analiz/surucu', '5. Sürücü', '5'),
      entityNav('yolcular', '/analiz/yolcu', '6. Yolcu', '6'),
      entityNav('yayalar', '/analiz/yaya', '9Y. Yaya', '9Y'),
    ] },
    { title: 'Modüller', items: MODULES.map((m) => ({ to: m.pages[0]?.route ?? `/modul/${m.id}`, label: m.name, sheet: m.pages[0]?.sheetName, badge: m.status === 'excel-bekleniyor' ? 'Excel bekleniyor' : settings.enabledModules.includes(m.id) ? undefined : 'kapalı' })) },
    ...(settings.showDrafts ? [{ title: 'Taslak gruplar', items: ['dorse', 'iz', 'olu-yarali', 'kaza-nedeni'].map((g) => ({ to: `/analiz/grup/${g}`, label: GROUP_TITLES[g] ?? g, sheet: 'Tanım' })) }] : []),
    { title: 'Araçlar', items: [{ to: '/bag-haritasi', label: 'Bağ Haritası ve Kontroller' }, { to: '/rapor/onizleme', label: 'Rapor Önizleme (A4)' }, { to: '/ayarlar', label: 'Ayarlar (Yönetici)', sheet: 'Tanım · BİLGİ HESAP' }] },
  ]

  return (
    <div className="flex h-full">
      <aside className={cn('no-print fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-lacivert text-white transition-transform lg:static lg:translate-x-0', navOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <img src="/brand/sb-bilirkisilik.png" alt="SB Bilirkişilik" className="h-11 w-11 rounded-md bg-white/90 object-contain p-0.5" />
          <div>
            <div className="font-display text-xl font-semibold leading-none tracking-wide">SERESLER</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-altin">Bilirkişilik Sistemi</div>
          </div>
        </div>
        <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3">
          {groups.map((g) => (
            <div key={g.title} className="mb-3">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/65">{g.title}</div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} className={({ isActive }) => cn('flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors', isActive || loc.pathname.startsWith(it.to.replace(/\/1$/, '')) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
                  <span>
                    <span className="block leading-tight">{it.label}</span>
                    {it.sheet && <span className="block text-[10px] text-white/70">Sayfa: {it.sheet}</span>}
                  </span>
                  {it.badge && <span className="rounded bg-altin/20 px-1.5 py-0.5 text-[9px] uppercase text-altin">{it.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-[10px] text-white/70">İçerik v{c.contentVersion} · ayar #{settings.lastHash}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-krem-200 bg-kagit/90 px-4 py-2 backdrop-blur lg:px-6">
          <button className="btn-ghost lg:hidden" onClick={() => setNavOpen((v) => !v)} aria-label="Menü">☰</button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <Kimlik label="Dosya" value={c.title} />
            <Kimlik label="Dosya No" value={String(c.dosya.dosyaNo ?? '—')} />
            <Kimlik label="Mahkeme" value={[c.dosya.mahkemeNo, c.dosya.mahkemeAdi].filter(Boolean).join(' ') || '—'} />
            <Kimlik label="Yer" value={[c.dosya.il, c.dosya.ilce].filter(Boolean).join(' / ') || '—'} />
            <Kimlik label="Tarih" value={formatDateTR(c.kazaYeri.tarih) || '—'} />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-krem-200 bg-white px-3 py-1.5 shadow-sm" title="Canlı sonuç sayacı">
            <span className="etiket">Sonuç</span>
            <span className="flex items-center gap-1 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-d-etken" /> ETKEN <AnimatedNumber value={summary.etken} /></span>
            <span className="flex items-center gap-1 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-d-incelenmeli" /> İNCELENMELİ <AnimatedNumber value={summary.incelenmeli} /></span>
            {summary.tanimsiz > 0 && <span className="text-[10px] text-amber-700" title="Kural tanımsız kart">⚠ {summary.tanimsiz}</span>}
          </div>
        </header>
        <main className="scroll-thin flex-1 overflow-y-auto px-4 py-5 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Kimlik({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="etiket mr-1">{label}</span>
      <span className="truncate font-medium text-lacivert">{value}</span>
    </span>
  )
}
