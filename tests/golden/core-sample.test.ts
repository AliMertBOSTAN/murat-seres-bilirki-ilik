import { describe, it, expect } from 'vitest'
import { ALL_FACTORS, STATUS_PROFILE_BY_ID, SAMPLE_CASE, EXCEL_MAP, CONSTANTS, CONTENT_VERSION } from '../../src/content'
import { evaluateFactor } from '../../src/engine/factor'
import { buildSummary } from '../../src/engine/summary'
import { weekdayTR, eqTR, concatenate } from '../../src/engine/excel-compat'
import { computeIstatistik } from '../../src/engine/istatistik'
import { computeSurucuKacinma } from '../../src/modules/kacinma-mutalaa/compute'
import type { FactorEntry } from '../../src/engine/types'
import { cached, normText, hasCell } from './helpers'
import ilIstatistik from '../../data/reference/il-istatistik-2023.json'
import ilceNufus from '../../data/reference/ilce-nufus-2023.json'
import kgm from '../../data/reference/kgm-trafik-sayim.json'

const caseData = SAMPLE_CASE as unknown as Record<string, unknown>
const entries = (SAMPLE_CASE as { factorEntries: FactorEntry[] }).factorEntries
const ctx = { caseData, profiles: STATUS_PROFILE_BY_ID, contentVersion: CONTENT_VERSION }
const cards = (EXCEL_MAP as { cards: { factorId: string; sheet: string; titleRow: number; statusRow: number }[] }).cards
const defById = new Map(ALL_FACTORS.map((f) => [f.id, f]))
const entryById = new Map(entries.map((e) => [e.factorId, e]))

describe('Excel uyumluluk yardımcıları', () => {
  it('Türkçe büyük/küçük harf eşleşmesi', () => {
    expect(eqTR('Yetersiz', 'YETERSİZ')).toBe(true)
    expect(eqTR('Aranmadı', 'ARANMADI')).toBe(true)
    expect(eqTR('ışık', 'IŞIK')).toBe(true)
    expect(eqTR('Belirsiz ', 'belirsiz')).toBe(true)
    expect(eqTR('Yok', 'Yeterli')).toBe(false)
  })
  it('haftanın günü (Grş 1!D28)', () => {
    expect(weekdayTR('2025-09-01')).toBe('PAZARTESİ')
    expect(weekdayTR('2025-09-01T00:00:00')).toBe(normText(cached('Grş 1', 'D28')))
  })
  it('rapor başlığı (3!B8)', () => {
    const d = caseData.dosya as Record<string, unknown>
    expect(concatenate(d.mahkemeNo, ' ', d.mahkemeAdi, ' ', d.raporTuru)).toBe('3 AĞIR CEZA MAHKEMESİ BİLİRKİŞİ RAPORUDUR')
    expect(concatenate(d.mahkemeNo, ' ', d.mahkemeAdi, ' ', d.raporTuru)).toBe(cached('3', 'B8'))
  })
})

describe('Etken kartları — Excel kayıtlı değerleri (tüm rapor sayfaları)', () => {
  const mismatches: string[] = []
  for (const card of cards) {
    const def = defById.get(card.factorId)!
    const entry = entryById.get(card.factorId)
    it(`${card.sheet}!B${card.titleRow} ${def.title}`, () => {
      const r = evaluateFactor(def, entry, ctx)
      // Durum (V)
      const expV = cached(card.sheet, `V${card.statusRow}`)
      const gotV = r.durumDefined ? r.durum : false
      if (hasCell(card.sheet, `V${card.statusRow}`)) {
        expect(gotV === false ? false : normText(gotV)).toEqual(expV === false ? false : normText(expV))
      }
      // Kazada durumu (H)
      if (hasCell(card.sheet, `H${card.statusRow}`)) {
        const expH = normText(cached(card.sheet, `H${card.statusRow}`))
        if (expH.startsWith('#')) return
        if (r.kazadaDurumu !== expH) mismatches.push(`${card.sheet}!H${card.statusRow}: "${r.kazadaDurumu}" ≠ "${expH}"`)
        expect(r.kazadaDurumu).toBe(expH)
      }
      // Ek dosya bayrağı (V başlık satırı) — formüllü ise
      if (def.ekDosya.kind === 'rule' && hasCell(card.sheet, `V${card.titleRow}`)) {
        const expF = normText(cached(card.sheet, `V${card.titleRow}`))
        if (!expF.startsWith('#')) expect(r.ekDosyaBayragi).toBe(expF)
      }
      // Açıklama / Nedensellik / Sorun
      for (const [key, got] of [['aciklama', r.aciklama], ['nedensellik', r.nedensellik], ['sorun', r.sorunAciklama]] as const) {
        const src = def.fields[key] as { excelCell?: string } | undefined
        if (!src?.excelCell) continue
        const exp = normText(cached(card.sheet, src.excelCell))
        if (exp.startsWith('#')) continue
        expect(got, `${key} @ ${card.sheet}!${src.excelCell}`).toBe(exp)
      }
    })
  }
})

describe('Sayfa 3 örnek beklentileri (§11.1)', () => {
  const byTitle = (t: string) => ALL_FACTORS.find((f) => f.sourceRef.sheet === '3' && f.title.replace(/\s+/g, ' ').startsWith(t))!
  const ev = (t: string) => evaluateFactor(byTitle(t), entryById.get(byTitle(t).id), ctx)
  it('durumlar', () => {
    expect(ev('1.4. SAAT/DAKİKA').durum).toBe('İNCELENMELİ')
    expect(ev('2.1. GÜN DURUMU').durum).toBe('ETKEN')
    expect(ev('2.3. HAVA DURUMU').durum).toBe('İNCELENMELİ')
    expect(ev('2.4. YOLUN SINIFI').durum).toBe('İNCELENMELİ')
    expect(ev('2.5 YOLUN AKIŞ YÖNÜ').durum).toBe('ETKEN DEĞİL')
    expect(ev('2.6 YOLUN KAPLAMA TİPİ').durum).toBe('İNCELENMELİ')
  })
  it('2.1 kazada durumu ve açıklama', () => {
    const r = ev('2.1. GÜN DURUMU')
    expect(r.kazadaDurumu).toBe('Şafak VaktiYönetmeliğe uygun güvenlik önleminin alınması')
    expect(r.aciklama).toBe('Gün doğumunda: Göz kamaşması, sis ve düşük görüş.')
    const okunur = evaluateFactor(byTitle('2.1. GÜN DURUMU'), entryById.get(byTitle('2.1. GÜN DURUMU').id), { ...ctx, settings: { renderMode: 'okunur', vlookupExactAlways: true } })
    expect(okunur.kazadaDurumu).toBe('Şafak Vakti Yönetmeliğe uygun güvenlik önleminin alınması')
  })
  it('5.1 sürücü kartı', () => {
    const f = ALL_FACTORS.find((x) => x.sourceRef.sheet === '5' && x.title.startsWith('5.1'))!
    const r = evaluateFactor(f, entryById.get(f.id), ctx)
    expect(r.durum).toBe('ETKEN DEĞİL')
    expect(r.kazadaDurumu).toBe('Reşit ')
  })
  it('4.2 araç kartı', () => {
    const f = ALL_FACTORS.find((x) => x.sourceRef.sheet === '4' && x.title.startsWith('4.2.'))!
    const r = evaluateFactor(f, entryById.get(f.id), ctx)
    expect(r.durum).toBe('ETKEN DEĞİL')
  })
})

describe('sonuç1', () => {
  it('ETKEN + İNCELENMELİ sayısı = 10 ve satırlar', () => {
    const results = ALL_FACTORS.filter((f) => f.sourceRef.sheet === '3').map((def) => {
      const entry = entryById.get(def.id)
      return { def, result: evaluateFactor(def, entry, ctx), muteala: String(entry?.excelMuteala ?? '') }
    })
    const s = buildSummary(results, ['yol-cevre'])
    expect(s.count).toBe(cached('sonuç1', 'A1'))
    expect(s.count).toBe(10)
    const titles = s.rows.map((r) => r.title.trim())
    for (let i = 4; i <= 13; i++) expect(titles).toContain(normText(cached('sonuç1', `B${i}`)).trim())
    const gun = s.rows.find((r) => r.title.startsWith('2.1'))!
    expect(gun.durum).toBe('ETKEN'); expect(gun.muteala).toBe('murat rasim seres')
    expect(s.rows.find((r) => r.title.startsWith('2.22.3'))!.muteala).toBe('sakıncası yok')
  })
})

describe('Sayfa 2. istatistik ve risk', () => {
  const c = CONSTANTS as typeof CONSTANTS
  const consts = {
    sabit1: c.oranSabitleri.sabit1_D23, sabit2: c.oranSabitleri.sabit2_G23, sabit3: c.oranSabitleri.sabit3_K23, sabit4: c.oranSabitleri.sabit4_O23,
    riskKatsayisi: c.riskKatsayisi_AC12, siklikTablosu: c.siklikTablosu, siklikEslemesi: c.siklikEslemesi_AD14 as Record<string, string>,
  }
  const ist = (SAMPLE_CASE as { istatistik: Record<string, unknown> }).istatistik
  const r = computeIstatistik({ il: 'Bursa', ilce: 'İnegöl', yolKesimNo: ist.yolKesimNo as string, yon: ist.yon as number, hareket: ist.hareket as number, yayaKatsayi: ist.yayaKatsayi as number, aracKatsayi: ist.aracKatsayi as number,
    siklikArac: ist.siklikArac as string, siklikYaya: ist.siklikYaya as string, siklikAracCarpan: ist.siklikAracCarpan as number, siklikYayaCarpan: ist.siklikYayaCarpan as number },
    { ilIstatistik: ilIstatistik.data as never, ilceNufus: ilceNufus.data as never, kgm: kgm.data as never, alRows: ilIstatistik.ilceKazaLookupAL as never }, consts)
  it('aramalar', () => {
    expect(r.ilNufus).toBe(3214571); expect(r.ilNufus).toBe(cached('2.', 'E14'))
    expect(r.ilceNufus).toBe(299203); expect(r.ilceNufus).toBe(cached('2.', 'E15'))
    expect(r.ilArac).toBe(1143096); expect(r.ilArac).toBe(cached('2.', 'E16'))
    expect(r.ilKaza).toBe(63581); expect(r.ilKaza).toBe(cached('2.', 'E17'))
    expect(r.yoluKullananArac).toBe(10221); expect(r.yolKm).toBe(29); expect(r.yolKazasi).toBe(1); expect(r.kamyonHizi).toBe(80); expect(r.kamyonHiziFazla).toBe(88)
    expect(r.ilceKazasi).toBe(2); expect(r.ilceKazasi).toBe(cached('2.', 'N17'))
  })
  it('Rn / Rt / Rk', () => {
    expect(r.Rn).toBeCloseTo(1.977900005941695, 12); expect(r.Rn).toBeCloseTo(cached('2.', 'B24') as number, 12)
    expect(r.Rt).toBeCloseTo(5.562175005423867, 12); expect(r.Rt).toBeCloseTo(cached('2.', 'J24') as number, 12)
    expect(r.Rk).toBeCloseTo(0.28372957636239116, 12); expect(r.Rk).toBeCloseTo(cached('2.', 'R24') as number, 12)
  })
  it('risk zinciri AC13 / AC14 / AD14 / AC15 / AD15', () => {
    expect(r.AC13).toBeCloseTo(0.0035, 12); expect(r.AC14).toBeCloseTo(0.0385, 12); expect(r.AD14).toBeCloseTo(0.1010625, 12)
    expect(r.AC15).toBeCloseTo(0.021, 12); expect(r.AD15).toBeCloseTo(0.02625, 12)
    expect(r.AD14).toBeCloseTo(cached('2.', 'AD14') as number, 12); expect(r.AD15).toBeCloseTo(cached('2.', 'AD15') as number, 12)
  })
})

describe('Sayfa 19 kaçınma', () => {
  it('hız ve kusur (1. sürücü)', () => {
    const m = (SAMPLE_CASE as { modules: { 'kacinma-mutalaa': { suruculer: { aldigiYol: number; yolunZamani: number; temelKusurPuani: number; senaryoPuanlari: number[] }[] } } }).modules['kacinma-mutalaa']
    const s1 = m.suruculer[0]
    const r = computeSurucuKacinma(s1)
    expect(r.hizKmS).toBeCloseTo(40.298507462686565, 12); expect(r.hizKmS).toBeCloseTo(cached('19', 'AF10') as number, 12)
    expect(r.hizMS).toBeCloseTo(11.194029850746269, 12)
    expect(r.senaryolar[2].durum).toBe('KAZADAN KAÇINABİLİRDİ'); expect(r.senaryolar[0].durum).toBe('KAZADAN KAÇINAMAZ')
    expect(r.toplamKusur).toBe(791); expect(r.toplamKusur).toBe(cached('19', 'AM19'))
    const s2 = computeSurucuKacinma(m.suruculer[1])
    expect(s2.hizKmS).toBeCloseTo(cached('19', 'AF32') as number, 12); expect(s2.toplamKusur).toBe(cached('19', 'AM42'))
  })
})
