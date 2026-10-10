/** Sayfa 2. — yer/zaman istatistikleri, Rn/Rt/Rk ve risk/sıklık zinciri (Excel formülleri birebir). */
import { eqTR } from './excel-compat'

export interface IlIstatistik { il: string; by?: { nufus: number; aracSayisi: number; kaza2023: number } }
export interface IlceNufus { il: string; ilce: string; nufus2023: number }
export interface KgmKesim { key: string | null; uzunlukKm: number | null; toplam: number | null; siniflar: { yogt: number | null; ortHiz: number | null; p85: number | null; hizPct: number | null }[]; yolKazaSayisi: number | null; ilceKazaSayisi: number | null }
export interface AlRow { il: string; row: number; bw_ilceKazaSayisi: number | null }

export interface IstatistikRef {
  ilIstatistik: IlIstatistik[]
  ilceNufus: IlceNufus[]
  kgm: KgmKesim[]
  alRows: AlRow[]
}

export interface IstatistikInput {
  il?: string; ilce?: string; yolKesimNo?: string | null
  yon?: number | null; hareket?: number | null; yayaKatsayi?: number | null; aracKatsayi?: number | null
  siklikArac?: string | null; siklikYaya?: string | null; siklikAracCarpan?: number | null; siklikYayaCarpan?: number | null
}

export interface IstatistikConstants {
  sabit1: number; sabit2: number; sabit3: number; sabit4: number; riskKatsayisi: number
  siklikTablosu: { etiket: string; katsayi: number; cell: string }[]
  siklikEslemesi: Record<string, string> // "5 Yıl" → "AD2" (Excel) …
  duzeltilmisSiklik?: boolean
}

export interface IstatistikResult {
  ilNufus: number | null; ilceNufus: number | null; ilArac: number | null; ilKaza: number | null
  yoluKullananArac: number | 'Belirsiz' | null; yolKm: number | 'Belirsiz' | null; yolKazasi: number | 'Belirsiz' | null
  kamyonHizi: number | 'Belirsiz' | null; kamyonHiziFazla: number | 'Belirsiz' | null; ilceKazasi: number | null
  Rn: number | ''; Rt: number | ''; Rk: number | ''
  AC13: number; AC14: number; AD14: number; AC15: number; AD15: number
  provenance: { step: string; detail: string; source?: string }[]
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0)

export function siklikKatsayi(etiket: string | null | undefined, c: IstatistikConstants): number | null {
  if (!etiket) return null
  if (c.duzeltilmisSiklik) {
    const map: Record<string, string> = { '1 Gün': 'Günlük', '1 Hafta': '1 Haftalık', '1 Ay': '1 Aylık', '3 Ay': '3 Aylık', '6 Ay': '6 Aylık', '1 Yıl': '1 Yıllık', '5 Yıl': '5 Yıllk', '10 Yıl': '10 Yıllık' }
    const row = c.siklikTablosu.find((r) => eqTR(r.etiket, map[etiket] ?? etiket))
    return row?.katsayi ?? null
  }
  const cell = c.siklikEslemesi[etiket]
  const row = c.siklikTablosu.find((r) => r.cell === cell)
  return row?.katsayi ?? null
}

export function computeIstatistik(input: IstatistikInput, ref: IstatistikRef, c: IstatistikConstants): IstatistikResult {
  const prov: IstatistikResult['provenance'] = []
  const il = ref.ilIstatistik.find((r) => eqTR(r.il, input.il))
  const ilNufus = il?.by?.nufus ?? null
  const ilArac = il?.by?.aracSayisi ?? null
  const ilKaza = il?.by?.kaza2023 ?? null
  prov.push({ step: 'İl', detail: `${input.il ?? ''}: nüfus ${ilNufus}, araç ${ilArac}, kaza ${ilKaza}`, source: 'Tanım!BY4:CH5000 (VLOOKUP 10/3/2)' })
  const ilce = ref.ilceNufus.find((r) => eqTR(r.ilce, input.ilce))
  const ilceNufus = ilce?.nufus2023 ?? null
  prov.push({ step: 'İlçe', detail: `${input.ilce ?? ''}: nüfus ${ilceNufus}`, source: 'Tanım!DE2:DF975' })
  const kesim = input.yolKesimNo ? ref.kgm.find((r) => r.key === input.yolKesimNo) : undefined
  const bel = (v: number | null | undefined): number | 'Belirsiz' | null => (!input.yolKesimNo ? 'Belirsiz' : v ?? null)
  const yoluKullananArac = bel(kesim?.toplam)
  const yolKm = bel(kesim?.uzunlukKm)
  const yolKazasi = bel(kesim?.yolKazaSayisi)
  const kamyonHizi = bel(kesim?.siniflar?.[4]?.ortHiz)
  const kamyonHiziFazla = bel(kesim?.siniflar?.[4]?.p85)
  prov.push({ step: 'KGM kesimi', detail: `${input.yolKesimNo ?? '(boş)'}: araç ${yoluKullananArac}, km ${yolKm}, kaza ${yolKazasi}, kamyon hızı ${kamyonHizi}/${kamyonHiziFazla}`, source: 'Tanım!AT4:BX5000 (VLOOKUP 8/6/31/26/27)' })
  const alRow = ref.alRows.find((r) => eqTR(r.il, input.il))
  const ilceKazasi = alRow?.bw_ilceKazaSayisi ?? null
  prov.push({ step: 'İlçe kazası (5 yıllık)', detail: `AL sırası satır ${alRow?.row ?? '?'} → BW = ${ilceKazasi}`, source: 'Tanım!AL3:BX5000 (VLOOKUP 38) — bkz. tutarsızlık #18' })

  const Rn = ilNufus && ilKaza !== null ? (ilKaza * c.sabit1) / ilNufus * 100 : ''
  const Rt = ilArac && ilKaza !== null ? (ilKaza * c.sabit1) / ilArac * 100 : ''
  const Rk = yolKm === 'Belirsiz' || yolKm === null || !yoluKullananArac || yoluKullananArac === 'Belirsiz' ? '' : (yolKm * c.sabit1) / yoluKullananArac * 100
  prov.push({ step: 'Rn', detail: `E17×D23/E14×100 = ${Rn}` }, { step: 'Rt', detail: `E17×D23/E16×100 = ${Rt}` }, { step: 'Rk', detail: `R15×D23/O15×100 = ${Rk} (etiket formülünden farklı — tutarsızlık #6)` })

  const AC13 = num(input.yon) * num(input.hareket) * c.riskKatsayisi
  const AC14 = AC13 * num(input.yayaKatsayi)
  const kArac = siklikKatsayi(input.siklikArac, c) ?? 0
  const AD14 = AC14 * kArac * num(input.siklikAracCarpan)
  const AC15 = num(input.aracKatsayi) * AC13
  const kYaya = c.duzeltilmisSiklik ? (siklikKatsayi(input.siklikYaya, c) ?? 1) : 1
  const AD15 = AC15 * kYaya * num(input.siklikYayaCarpan)
  prov.push({ step: 'Risk zinciri', detail: `AC13=${AC13}, AC14=${AC14}, AD14=${AD14} (sıklık ${input.siklikArac} → ${kArac}), AC15=${AC15}, AD15=${AD15}` })
  return { ilNufus, ilceNufus, ilArac, ilKaza, yoluKullananArac, yolKm, yolKazasi, kamyonHizi, kamyonHiziFazla, ilceKazasi, Rn, Rt, Rk, AC13, AC14, AD14, AC15, AD15, provenance: prov }
}
