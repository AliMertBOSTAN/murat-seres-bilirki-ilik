import { describe, it, expect } from 'vitest'
import ilIlce from '../../data/reference/il-ilce.json'
import bursa from '../../data/reference/mahalle/bursa.json'
import { PARTY_LABELS, ALL_FACTORS, STATUS_PROFILE_BY_ID, STATUS_PROFILES } from '../../src/content'
import { evaluateFactor } from '../../src/engine/factor'
import { decideStatus } from '../../src/engine/status'
import { buildGraph, validateGraph } from '../../src/engine/graph'
import { trUpper } from '../../src/engine/excel-compat'
import { normalizeCase } from '../../src/model/case'
import type { FactorEntry } from '../../src/engine/types'

describe('Bağımlı listeler (il → ilçe → mahalle)', () => {
  it('Bursa → İnegöl → CEBECİ', () => {
    const ilceler = (ilIlce.data as Record<string, string[]>)['Bursa']
    expect(ilceler).toContain('İnegöl')
    const mah = (bursa.ilceler as Record<string, unknown[]>)[Object.keys(bursa.ilceler).find((k) => trUpper(k) === trUpper('İnegöl'))!]
    const names = mah.map((m) => (typeof m === 'string' ? m : (m as { mahalle: string }).mahalle))
    expect(names.length).toBeGreaterThan(100)
    expect(names).toContain('CERRAH')
    // Excel örneğindeki "CEBECİ" İnegöl listesinde yok (Tanım!AF listesi boş kaydedilmiş; değer elle yazılmış) — tutarsızlık #31
    expect(names).not.toContain('CEBECİ')
  })
  it('81 il', () => { expect(Object.keys(ilIlce.data).length).toBe(81) })
})

describe('Taraf etiket setleri (Tanım!A64:D79)', () => {
  it('dört set, ilk etiketler', () => {
    const sets = (PARTY_LABELS as { sets: { id: string; labels: string[] }[] }).sets
    expect(sets.map((s) => s.id)).toEqual(['ceza', 'hukuk', 'savcilik', 'icra'])
    expect(sets[0].labels[0]).toBe('DOSYA NO'); expect(sets[0].labels[1]).toBe('MÜŞTEKİ/MAĞDUR'); expect(sets[0].labels[4]).toBe('SANIK')
    expect(sets[1].labels[1]).toBe('DAVACI'); expect(sets[2].labels[0]).toBe('SORUŞTURMA NO'); expect(sets[2].labels[3]).toBe('ŞÜPHELİ'); expect(sets[3].labels[1]).toBe('ALACAKLI')
  })
})

describe('Araç 2 doğru veriyi gösterir (tutarsızlık #1)', () => {
  it('4.2 Araç Cinsi, entityIndex 1', () => {
    const def = ALL_FACTORS.find((f) => f.id === 'arac.arac-cinsi')!
    const c = normalizeCase({ araclar: [{ cinsi: '1- Otomobil' }, { cinsi: '5) Kamyon' }], factorEntries: [] })
    const entry: FactorEntry = { factorId: def.id, entityIndex: 1, incelemeDurumu: 'Yok' }
    const r = evaluateFactor(def, entry, { caseData: c as unknown as Record<string, unknown>, profiles: STATUS_PROFILE_BY_ID })
    expect(r.valueText).toBe('5) Kamyon')
    expect(r.durum).toBe('ETKEN')
    expect(r.provenance[0].detail).toContain('araclar[1].cinsi')
  })
})

describe('Durum kural profilleri', () => {
  it('Excel varyantları ve tanımsız dallar', () => {
    const yol = STATUS_PROFILE_BY_ID.get('yol-cevre')!, arac = STATUS_PROFILE_BY_ID.get('arac')!, kisi = STATUS_PROFILE_BY_ID.get('kisi')!
    expect(decideStatus(yol, 'yetersiz').durum).toBe('İNCELENMELİ')
    expect(decideStatus(arac, 'Yetersiz').durum).toBe('ÖZEL İSTEMLİ')
    expect(decideStatus(arac, 'Belirsiz').durum).toBe('İNCELEMELİ')
    expect(decideStatus(kisi, 'Belirsiz').durum).toBe('ÖZEL İSTEMLİ')
    expect(decideStatus(yol, 'Yapıldı').defined).toBe(false)
    expect(decideStatus(arac, 'Davranış').defined).toBe(false)
    expect(decideStatus(yol, 'Davranış').durum).toBe('İNCELENMELİ')
    const merged = STATUS_PROFILES.find((p) => p.id === 'birlesik')!
    expect(decideStatus(merged, 'Yapıldı').durum).toBe('ETKEN DEĞİL')
  })
  it('birleşik profil geçersiz kılması', () => {
    const def = ALL_FACTORS.find((f) => f.id === 'arac.arac-cinsi')!
    const c = normalizeCase({ araclar: [{ cinsi: 'x' }] })
    const r = evaluateFactor(def, { factorId: def.id, entityIndex: 0, incelemeDurumu: 'Yetersiz' }, { caseData: c as unknown as Record<string, unknown>, profiles: STATUS_PROFILE_BY_ID, settings: { renderMode: 'excel', statusProfileOverride: 'birlesik', vlookupExactAlways: true } })
    expect(r.durum).toBe('İNCELENMELİ')
  })
})

describe('Bağımlılık grafiği', () => {
  it('döngü yok, her kart özete bağlı', () => {
    const g = buildGraph(ALL_FACTORS.filter((f) => !f.draft))
    const v = validateGraph(g)
    expect(v.cycles.length).toBe(0)
    const factors = g.nodes.filter((n) => n.kind === 'factor')
    for (const f of factors) expect(g.edges.some((e) => e.source === f.id && e.target === 'summary')).toBe(true)
  })
})

describe('Kütüphane bütünlüğü', () => {
  it('178 etken, kimlikler benzersiz, canlı kartların metinleri boş değil', () => {
    expect(ALL_FACTORS.length).toBeGreaterThanOrEqual(170)
    expect(new Set(ALL_FACTORS.map((f) => f.id)).size).toBe(ALL_FACTORS.length)
    const live = ALL_FACTORS.filter((f) => !f.draft)
    expect(live.length).toBe(105)
    for (const f of live) expect(f.libraryRowCount ?? 0).toBeGreaterThan(0)
  })
})
