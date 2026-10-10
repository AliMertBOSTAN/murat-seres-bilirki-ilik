/** Referans veri erişimi (il/ilçe/mahalle, istatistik). Büyük setler gerektiğinde yüklenir. */
import ilIlce from '@data/reference/il-ilce.json'
import mahalleIndex from '@data/reference/mahalle/index.json'
import { trUpper } from '@/engine/excel-compat'

const mahalleFiles = import.meta.glob('../../data/reference/mahalle/*.json') as Record<string, () => Promise<{ default: { il: string; ilceler: Record<string, (string | { mahalle: string; belde: string })[]> } }>>

export const ILLER: string[] = Object.keys(ilIlce.data)
export function getIlceler(il: string | undefined | null): string[] {
  if (!il) return []
  const key = ILLER.find((k) => trUpper(k) === trUpper(il))
  return key ? (ilIlce.data as Record<string, string[]>)[key] : []
}

const cache = new Map<string, Promise<Record<string, (string | { mahalle: string; belde: string })[]>>>()
export function getMahalleler(il: string | undefined | null, ilce: string | undefined | null): Promise<string[]> {
  if (!il || !ilce) return Promise.resolve([])
  const files = mahalleIndex.files as Record<string, string>
  const key = Object.keys(files).find((k) => trUpper(k) === trUpper(il))
  if (!key) return Promise.resolve([])
  const file = files[key]
  if (!cache.has(file)) {
    const path = Object.keys(mahalleFiles).find((p) => p.endsWith('/' + file))
    cache.set(file, path ? mahalleFiles[path]().then((m) => m.default.ilceler) : Promise.resolve({}))
  }
  return cache.get(file)!.then((ilceler) => {
    const ik = Object.keys(ilceler).find((k) => trUpper(k) === trUpper(ilce))
    if (!ik) return []
    return ilceler[ik].map((m) => (typeof m === 'string' ? m : `${m.mahalle} (${m.belde})`))
  })
}

export async function loadIstatistikRef() {
  const [ilIst, ilceNufus, kgm] = await Promise.all([
    import('@data/reference/il-istatistik-2023.json'), import('@data/reference/ilce-nufus-2023.json'), import('@data/reference/kgm-trafik-sayim.json'),
  ])
  return { ilIstatistik: ilIst.default.data, ilceNufus: ilceNufus.default.data, kgm: kgm.default.data, alRows: ilIst.default.ilceKazaLookupAL, meta: { il: ilIst.default.version, ilce: ilceNufus.default.version, kgm: kgm.default.version } }
}
