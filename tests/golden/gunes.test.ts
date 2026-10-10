import { describe, it, expect } from 'vitest'
import { solarPosition, glareForVehicle, classify } from '../../src/modules/gunes-etkenligi/solar'
import { parseNumberTR } from '../../src/engine/excel-compat'

describe('Güneş modülü altın değerleri (NOAA ±0,5°)', () => {
  it('G-1 Excel örneği: 2026-02-16 12:00 İstanbul, heading 90°', () => {
    const s = solarPosition({ date: '2026-02-16', time: '12:00', utcOffset: 3, lat: 41.0082, lon: 28.9784 })
    expect(s.N).toBe(47)
    expect(s.eot).toBeCloseTo(-14.23, 1)
    expect(s.declDeg).toBeCloseTo(-12.61, 1)
    expect(s.tst).toBeCloseTo(641.7, 0)
    expect(s.ha).toBeCloseTo(-19.58, 1)
    expect(s.elevation).toBeCloseTo(33.41, 1)
    expect(s.azimuth).toBeCloseTo(156.94, 1)
    const g = glareForVehicle(s, { heading: 90, pitch: 0, hizKmS: 50, reaksiyonS: 1.5 })
    expect(g.theta).toBeCloseTo(70.91, 1)
    expect(g.sinif).toBe('Düşük/önemsiz'); expect(g.K).toBe(1)
    expect(g.reaksiyonMesafesiNormal).toBeCloseTo(20.83, 2); expect(g.reaksiyonMesafesiGlare).toBeCloseTo(20.83, 2)
  })
  it('G-2 çekirdek örneği: 2025-09-01 17:45 İnegöl, heading 270°', () => {
    const s = solarPosition({ date: '2025-09-01', time: '17:45', utcOffset: 3, lat: 40.0806, lon: 29.5097 })
    expect(s.elevation).toBeCloseTo(20.20, 1)
    expect(s.azimuth).toBeCloseTo(264.02, 1)
    const g = glareForVehicle(s, { heading: 270, hizKmS: 50, reaksiyonS: 1.5 })
    expect(g.theta).toBeCloseTo(21.03, 1)
    expect(g.sinif).toBe('Orta'); expect(g.K).toBe(0.8)
    expect(g.reaksiyonMesafesiGlare).toBeCloseTo(26.04, 2)
  })
  it('sınıf bantları ve yerel ayar güvenli sayı', () => {
    expect(classify(3).sinif).toBe('Tam körlük'); expect(classify(7).K).toBe(0.4); expect(classify(15).sinif).toBe('Yüksek'); expect(classify(30).K).toBe(0.8); expect(classify(90).K).toBe(1)
    expect(parseNumberTR('41.0082')).toBeCloseTo(41.0082); expect(parseNumberTR('41,0082')).toBeCloseTo(41.0082); expect(parseNumberTR('1.5')).toBe(1.5); expect(parseNumberTR('1,5')).toBe(1.5); expect(parseNumberTR('+3')).toBe(3)
  })
})
