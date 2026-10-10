# SERESLER BİLİRKİŞİLİK — Web Uygulaması

Trafik kazası bilirkişiliği için Excel'de kurulmuş **SERESLER BİLİRKİŞİLİK** sisteminin (`EĞİTİM 001.xlsx` + `2.2 Gunes_Etkenligi_Model.xlsx`) Netlify'da çalışan modüler web uygulaması.

- Çalışma mantığı Excel ile bire bir; **altın testler** Excel'in kayıtlı hesap değerlerine kilitler (`tests/golden`).
- Sayfa yapısı ve numaralandırma korunur; sol navigasyonda her öğenin Excel sayfa adı yazar.
- Etken kartları tek, veri odaklı şablondan üretilir (`content/core/factors/*.json`); "Neden?" paneli her sonucun hangi girdi, kural ve kütüphane sürümünden geldiğini gösterir.
- Modüller (Güneş Etkenliği, Kazadan Kaçınma) manifest sözleşmesiyle eklenir; içerik paketleri Ayarlar'dan JSON olarak yüklenir.
- Ayarlar (bilgi bankası, listeler, kural profilleri, katsayılar, referans veriler, tutarsızlık raporu) yönetici parolasıyla korunur ve sürümlenir.

## Yerel geliştirme

```bash
npm install
npm run dev            # http://localhost:5173
npm run build && npm run preview   # üretim derlemesi, http://localhost:4173
npm test               # Vitest: altın + birim testler (128)
npx playwright test    # uçtan uca duman testi (Chrome gerektirir)
netlify dev            # Functions + Blobs ile birlikte (Netlify CLI)
```

Demo yönetici parolası: Functions çalışmıyorsa (yerel statik önizleme) `seres`; Netlify'da `ADMIN_PASSCODE` ortam değişkeni.

## Excel'den içerik üretimi (Faz 0)

```bash
python3 -m pip install openpyxl
npm run extract        # scripts/extract/extract_workbook.py → scripts/extract/out/{core,gunes}
npm run build:content  # scripts/extract/build_content.py → content/, data/reference/, tests/golden/expected.json, docs/excel-analysis.md
```

Betikler metinleri elle kopyalamaz; her alan Excel hücre referansıyla taşınır. Yeni bir Excel geldiğinde aynı yöntem uygulanır.

## Dizinler

| Dizin | İçerik |
|---|---|
| `scripts/extract/` | Çıkarım (openpyxl + ham XML: x14 veri doğrulama/koşullu biçim, köprü, çizim, dış bağlantı) ve içerik derleme betikleri, formül ayrıştırıcı |
| `content/core/` | Etken kütüphanesi (178 etken: 105 canlı kart + 73 taslak), listeler (130), kural profilleri, delil kodları, hukuki metinler, rapor meta, sabitler, örnek dosya, Excel hücre haritası |
| `content/modules/` | Modül içerikleri (güneş) |
| `data/reference/` | İl/ilçe (995), mahalle (33.523, il başına parça), il istatistikleri, ilçe nüfusu, KGM trafik sayımı (4.097 kesim) |
| `src/engine/` | Excel uyumluluk yardımcıları, kart motoru, durum kuralları, istatistik, seçiciler, bağımlılık grafiği, kontroller |
| `src/modules/` | Modül sözleşmesi, kayıt defteri, Güneş ve Kaçınma modülleri, iskelet modüller |
| `src/pages/`, `src/components/` | Rotalar ve Etken Kartı / provenance bileşenleri |
| `netlify/functions/` | `auth-admin`, `settings-get`, `settings-put`, `module-pack-upload` (Netlify Blobs) |
| `docs/` | `excel-analysis.md`, `tutarsizlik-raporu.md` (31 madde), `acik-sorular.md` (23 soru), `adr/ADR-001..006`, `screens/` |

## Netlify dağıtımı

1. Depoyu Netlify'a bağlayın (`netlify.toml` build komutu `npm run build`, publish `dist`, functions `netlify/functions`).
2. Ortam değişkeni: `ADMIN_PASSCODE` (yönetici parolası). Netlify Blobs otomatik etkindir (`settings`, `packs` depoları).
3. SPA yönlendirmesi `netlify.toml` içinde (`/* → /index.html 200`); yenilemede 404 olmaz.
4. `netlify deploy --prod` veya git push ile yayın.

## Yeni modül ekleme

1. `src/modules/<id>/index.tsx` içinde `ModuleManifest` (inputs/outputs/pages/hooks/reportSections) ve `ModuleDefinition` (Page, isteğe bağlı `suggest`, `ReportSection`) tanımlayın.
2. `src/modules/registry.ts` listesine ekleyin. Kayıt defteri sahipsiz girdi, döngü ve sürüm uyumsuzluğunu denetler.
3. Modül yalnızca Dosya deposundaki isimlendirilmiş alanlar üzerinden okur/yazar (`modules.<id>.*`); modüller birbirini import etmez.
4. Hesap fonksiyonlarını saf tutun ve altın testlerini `tests/golden` altına ekleyin.

Yalnız içerik (kod yok) için: `{ id, factors: FactorDef[], lists: {...} }` biçiminde JSON paketini Ayarlar › Modüller'den yükleyin.

## Durum

| Faz | Durum |
|---|---|
| 0 Analiz, çıkarım, içerik paketleri, ADR'ler | ✅ |
| 1 İskelet, tasarım sistemi, depo, motor, Etken Kartı, altın testler | ✅ |
| 2 Sayfa 2., 4 (çok varlıklı), 5, 6, 9Y, provenance, Bağ Haritası | ✅ |
| 3 Modül sistemi, Güneş (düzeltilmiş NOAA, araç başına θ, kart önerisi), Kaçınma | ✅ |
| 4 Ayarlar paneli, sürümleme, Netlify Functions/Blobs, içerik paketi | ✅ (profil matrisi düzenleme yeni paket sürümüyle) |
| 5 A4 belge modu, PDF/DOCX, Excel içe aktarma, demo modu, Lighthouse, Playwright, Netlify yayını | ✅ kod; canlı URL için Netlify hesabı gerekir |
