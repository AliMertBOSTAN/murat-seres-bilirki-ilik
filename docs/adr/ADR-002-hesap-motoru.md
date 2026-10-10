# ADR-002: Hesap motoru (formüllerin taşınması)

**Durum:** Kabul edildi

## Bağlam
Tanım sayfasında 99.914 formül var; bunların %90'ı bağımlı liste motoru (`COUNTIF`/`VLOOKUP`/`ROW`). Rapor sayfalarındaki kart formülleri ise beş kalıba iner: IF-zinciri durum tablosu, CONCATENATE kazada-durumu cümlesi, VLOOKUP seçenek metni, doğrudan kütüphane referansı, duruma bağlı sorun metni.

## Karar
**Bildirimsel kural motoru + saf TypeScript fonksiyonları.**
- Etken kartları, Faz 0 çıkarımının ürettiği JSON tanımlarından (`content/core/factors/*.json`) üretilir. Her kartın `fields`, `kazadaDurumu`, `ekDosya`, `statusProfile` alanları formüllerden **yapısal olarak** çıkarılmış küçük bir "kaynak tanımlayıcı" dilidir (`option | text | conditional | parts | literal`). Motor (`src/engine/factor.ts`) bu tanımlayıcıları yorumlar.
- Durum kuralları JSON tablolarıdır (`status-profiles.json`).
- Sayısal hesaplar (Rn/Rt/Rk, risk, kaçınma, güneş) birim testli saf fonksiyonlardır (`src/engine/*.ts`, `src/modules/*/`).
- Excel yardımcıları `src/engine/excel-compat.ts`: `eqTR`, `vlookupExact`, `concatenate`, `weekdayTR`, `today`, `textFormat`.
- Tanım'daki liste motoru taşınmaz; `data/reference/*.json` indeksleri kullanılır.

## Seçenekler
HyperFormula ile formülleri aynen çalıştırmak (reddedildi: kırık referanslar, 18 MB hücre verisi, provenance yok). Kart başına el yazımı bileşen (reddedildi: 178 kart, bakım maliyeti).

## Ödünleşim
Formül ile kod arasında sapma riski. Bunu `tests/golden` (Excel'in önbellekli değerleri) ve "Excel uyumlu mod" kapatır.

## Sonuçlar
Yeni bir Excel geldiğinde aynı çıkarım betiği çalıştırılır; motor değişmez, içerik paketi değişir.
