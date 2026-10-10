# ADR-001: Uygulama tipi ve barındırma

**Durum:** Kabul edildi (Faz 0)

## Bağlam
Netlify üzerinde, demo odaklı, sunucu maliyeti olmayan ve çevrimdışı da çalışabilen bir uygulama gerekiyor. Excel'deki hesap mantığı (100 bin formül) tarayıcıda yeniden üretilecek.

## Karar
**Vite + React 19 + TypeScript** statik SPA. Netlify'da yayın. Sunucu ihtiyacı yalnızca merkezi Ayarlar için; bu **Netlify Functions + Netlify Blobs** ile çözülür. (Prompt React 18 der; şablon React 19 verdi, API uyumlu, fark yok.)

## Seçenekler
| Seçenek | Karmaşıklık | Maliyet | Ölçek | Not |
|---|---|---|---|---|
| **A. Vite SPA + Functions (seçilen)** | Düşük | ~0 | Yeterli | Hızlı, çevrimdışı destekli, basit dağıtım |
| B. Next.js (SSR) | Orta | Düşük | Yüksek | SSR gereksiz, Netlify adaptörü ek karmaşıklık |
| C. Excel'i tarayıcıda çalıştırmak (HyperFormula) | Yüksek | 0 | Düşük | 6 MB dosya, kırık referanslar, UX zayıf |

## Ödünleşim
SPA'da SEO yok (gerekmez). Merkezi ayarlar için Functions bağımlılığı var; ağ yokken paketle gelen varsayılan ayarlar kullanılır.

## Sonuçlar
Hesap mantığı TypeScript'te yazılır ve altın testlerle Excel'e kilitlenir.

## Eylem maddeleri
- [x] Vite şablonu, `netlify.toml`, SPA yönlendirmesi
- [x] `tests/golden/expected.json` üretimi (Faz 0)
- [ ] Netlify canlı URL
