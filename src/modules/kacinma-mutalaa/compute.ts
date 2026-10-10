/** Sayfa 19 — sürücü kazadan kaçınma hesabı ve kusur puanlaması (Excel formülleri birebir). */

export type KacinmaDurumu = 'KAZADAN KAÇINAMAZ' | 'KAZADAN KAÇINMA' | 'KAZADAN KAÇINABİLİRDİ' | ''

export interface SurucuKacinmaInput {
  aldigiYol: number | null | undefined   // y (m)  — R10
  yolunZamani: number | null | undefined // t (s)  — V10
  temelKusurPuani: number | null | undefined // AR12 (dış dosya SRNK!AS47 → elle)
  senaryoPuanlari: (number | null | undefined)[] // AS13:AS17, 0–5
  bilincliTaksirCarpani?: number // AH21, varsayılan 1
}

export interface SurucuKacinmaResult {
  hizKmS: number | ''; hizMS: number | ''
  senaryolar: { index: number; puan: number; durum: KacinmaDurumu; kusur: number | '' }[]
  toplamKusur: number
  provenance: { step: string; detail: string; source?: string }[]
}

/** Excel AR13 çarpanları: 1→5, 2→2, 3→3, 4→4; 0 ve 5 → 0. Düzeltilmiş: puan/5 doğrusal. */
export const SENARYO_CARPANLARI_EXCEL: Record<number, number> = { 0: 0, 1: 5, 2: 2, 3: 3, 4: 4, 5: 0 }

export function kacinmaDurumu(puan: number | null | undefined): KacinmaDurumu {
  if (puan === null || puan === undefined || puan === ('' as unknown)) return 'KAZADAN KAÇINAMAZ' // Excel: boş hücre = 0
  if (puan === 0) return 'KAZADAN KAÇINAMAZ'
  if (puan === 5) return 'KAZADAN KAÇINMA'
  if (puan > 0) return 'KAZADAN KAÇINABİLİRDİ'
  return ''
}

export function computeSurucuKacinma(i: SurucuKacinmaInput, opts: { duzeltilmisCarpan?: boolean } = {}): SurucuKacinmaResult {
  const prov: SurucuKacinmaResult['provenance'] = []
  const y = Number(i.aldigiYol), t = Number(i.yolunZamani)
  const ok = Number.isFinite(y) && Number.isFinite(t) && t !== 0
  const hizKmS = ok ? ((y * 3600) / t) / 1000 : ''
  const hizMS = ok ? (y * 1) / t : ''
  prov.push({ step: 'Hız', detail: `V = ((y×3600)/t)/1000 = ((${y}×3600)/${t})/1000 = ${hizKmS} km/s; ${hizMS} m/s`, source: '19!AF10, 19!AI10' })
  const AR12 = Number(i.temelKusurPuani) || 0
  const senaryolar = (i.senaryoPuanlari ?? []).slice(0, 5).map((p, idx) => {
    const puan = Number(p) || 0
    const durum = kacinmaDurumu(puan)
    let kusur: number | '' = ''
    if (puan === 0 || puan === 5) kusur = 0
    else if (opts.duzeltilmisCarpan) kusur = (AR12 / 5) * puan
    else if (puan in SENARYO_CARPANLARI_EXCEL) kusur = (AR12 / 5) * SENARYO_CARPANLARI_EXCEL[puan]
    return { index: idx + 1, puan, durum, kusur }
  })
  const sum = senaryolar.reduce((a, s) => a + (typeof s.kusur === 'number' ? s.kusur : 0), 0)
  const toplamKusur = sum === 0 ? 0 : sum * (i.bilincliTaksirCarpani ?? 1)
  prov.push({ step: 'Kusur', detail: `Σ AR13:AR17 = ${sum} × AH21 (${i.bilincliTaksirCarpani ?? 1}) = ${toplamKusur}`, source: '19!AM19' })
  return { hizKmS, hizMS, senaryolar, toplamKusur, provenance: prov }
}

export interface KurumKacinmaInput {
  temelKusur: number | null | undefined // O87 / O119
  bilgiSuresi: string | null | undefined // 'Belirsiz' | '1 Ay' | '3 Ay' | '6 Ay' | '12 Ay' | 'İşleme alınmamış'
  carpanlar?: Record<string, number> // {'1 Ay':1.1,'3 Ay':1.3,'6 Ay':1.5,'12 Ay':1.7,'İşleme alınmamış':2}
  senaryoPuani: number | null | undefined // AS90..AS94'ten dolu olan
}

export const KURUM_CARPANLARI: Record<string, number> = { '1 Ay': 1.1, '3 Ay': 1.3, '6 Ay': 1.5, '12 Ay': 1.7, 'İşleme alınmamış': 2 }

export function computeKurumKacinma(i: KurumKacinmaInput, opts: { duzeltilmisAnlam?: boolean } = {}) {
  const O = Number(i.temelKusur) || 0
  const c = i.carpanlar ?? KURUM_CARPANLARI
  const bs = i.bilgiSuresi ?? ''
  const AR = bs === 'Belirsiz' || bs === '' ? O : (c[bs] ?? 1) * O  // 19!AR89
  const p = i.senaryoPuani
  let durum: KacinmaDurumu | '' = ''
  if (p !== null && p !== undefined) {
    // Excel (AM90): 0→KAÇINMA, 5→KAÇINAMAZ, ≥0→KAÇINABİLİRDİ (sürücü satırlarının tersi — tutarsızlık #7)
    if (opts.duzeltilmisAnlam) durum = kacinmaDurumu(Number(p))
    else durum = Number(p) === 0 ? 'KAZADAN KAÇINMA' : Number(p) === 5 ? 'KAZADAN KAÇINAMAZ' : Number(p) >= 0 ? 'KAZADAN KAÇINABİLİRDİ' : ''
  }
  const kusur = p === null || p === undefined ? 0 : AR // 19!AM97 = AVERAGE(dolu AR) × AH99
  return { AR, durum, kusur, provenance: [{ step: 'Kurum kusuru', detail: `O×çarpan(${bs || 'Belirsiz'}) = ${AR}; senaryo ${p ?? '(boş)'} → ${durum}`, source: '19!AR89, 19!AM97' }] }
}
