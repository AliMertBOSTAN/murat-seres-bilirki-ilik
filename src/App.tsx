import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { GirisPage } from '@/pages/GirisPage'
import { VeriPage } from '@/pages/VeriPage'
import { AciklamalarPage } from '@/pages/AciklamalarPage'
import { FactorGroupPage } from '@/pages/FactorGroupPage'
import { SonucPage } from '@/pages/SonucPage'
import { MODULE_BY_ID } from '@/modules/registry'
import { ModulePage } from '@/pages/ModulePage'

const L = (f: () => Promise<Record<string, ComponentType>>, name: string) => { const C = lazy(() => f().then((m) => ({ default: m[name] }))); return () => <Suspense fallback={<div className="p-8 text-sm text-gri">Yükleniyor…</div>}><C /></Suspense> }
const YerIstatistikPage = L(() => import('@/pages/YerIstatistikPage'), 'YerIstatistikPage')
const BagHaritasiPage = L(() => import('@/pages/BagHaritasiPage'), 'BagHaritasiPage')
const RaporOnizlemePage = L(() => import('@/pages/RaporOnizlemePage'), 'RaporOnizlemePage')
const AyarlarPage = L(() => import('@/pages/AyarlarPage'), 'AyarlarPage')

function GroupRoute({ group }: { group: string }) { return <FactorGroupPage group={group} /> }
function ModuleRoute() { const { id } = useParams(); const m = MODULE_BY_ID.get(id ?? ''); return <ModulePage module={m} /> }

export const router = createBrowserRouter([
  {
    path: '/', element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dosya/giris" replace /> },
      { path: 'dosya/giris', element: <GirisPage /> },
      { path: 'dosya/veri', element: <VeriPage /> },
      { path: 'rapor/aciklamalar', element: <AciklamalarPage /> },
      { path: 'analiz/yer-istatistik', element: <YerIstatistikPage /> },
      { path: 'analiz/yol-cevre', element: <GroupRoute group="yol-cevre" /> },
      { path: 'sonuc', element: <SonucPage /> },
      { path: 'analiz/arac/:n', element: <GroupRoute group="arac" /> },
      { path: 'analiz/surucu/:n', element: <GroupRoute group="surucu" /> },
      { path: 'analiz/yolcu/:n', element: <GroupRoute group="yolcu" /> },
      { path: 'analiz/yaya/:n', element: <GroupRoute group="yaya" /> },
      { path: 'analiz/grup/:group', element: <FactorGroupPage /> },
      { path: 'modul/kacinma', element: <ModulePage module={MODULE_BY_ID.get('kacinma-mutalaa')} /> },
      { path: 'modul/gunes', element: <ModulePage module={MODULE_BY_ID.get('gunes-etkenligi')} /> },
      { path: 'modul/gunes/:alt', element: <ModulePage module={MODULE_BY_ID.get('gunes-etkenligi')} /> },
      { path: 'modul/:id', element: <ModuleRoute /> },
      { path: 'bag-haritasi', element: <BagHaritasiPage /> },
      { path: 'rapor/onizleme', element: <RaporOnizlemePage /> },
      { path: 'ayarlar', element: <AyarlarPage /> },
      { path: 'ayarlar/:section', element: <AyarlarPage /> },
      { path: '*', element: <Navigate to="/dosya/giris" replace /> },
    ],
  },
])
