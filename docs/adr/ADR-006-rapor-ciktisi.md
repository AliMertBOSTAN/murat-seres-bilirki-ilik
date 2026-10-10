# ADR-006: Rapor çıktısı

**Durum:** Kabul edildi

## Karar
- Ekranda A4 **Belge Modu** (CSS `@page`, Excel başlık/altbilgi düzeninin kopyası: sol logo, orta firma + rapor türü, sağ Dok.No / Sayfa No / Haz.Tarihi / Revizyon / İso / Bağ.Ol / Yıl / Klasör / Arşiv; alt satır Birim / Konu / Yenileyen; altbilgi "NOT: BU SAYFAYI…").
- **PDF:** tarayıcı yazdırma (print CSS). İsteğe bağlı `@react-pdf/renderer` sonraya.
- **DOCX:** `docx` kütüphanesi.
- **Excel'e geri aktarma:** ExcelJS ile Grş 1 düzeninde (Faz 4, isteğe bağlı).
- Rapor bölüm sırası Excel sayfa sırasıdır; son sayfada ayar sürüm hash'i ve üretim zamanı.

## Teknoloji
React Router, Tailwind CSS v4, Framer Motion, Recharts, React Flow (@xyflow/react), Leaflet, zod, SheetJS, Dexie, Vitest, Playwright (smoke).

## Ödünleşim
Tarayıcı yazdırma PDF'i tarayıcıya göre değişebilir; print CSS ile sabitlenir, ekran görüntüsü karşılaştırması `docs/screens/`.
