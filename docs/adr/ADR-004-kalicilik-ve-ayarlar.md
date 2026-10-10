# ADR-004: Kalıcılık ve Ayarlar

**Durum:** Kabul edildi

## Karar
- Dosya verisi **IndexedDB**'de (Dexie); `.seres.json` dışa/içe aktarma.
- Ayarlar üç katman: **paketle gelen varsayılan JSON → merkezi Ayarlar (Netlify Blobs, yönetici parolası) → yerel geçersiz kılma**. Birleştirme sırası sabit, çakışmada yerel kazanır.
- Her Ayarlar kaydı **sürümlü** (semver + değişiklik notu + SHA-256 hash).
- Her dosya oluşturulduğunda yürürlükteki **ayar sürüm hash'ini dondurur**; rapor son sayfasında yazılır. Eski dosya kendi sürümüyle gösterilir, "yeni sürüme yükselt" seçeneği sunulur.
- Yönetici kimlik doğrulaması: demo için `ADMIN_PASSCODE` ortam değişkeni + HMAC imzalı 2 saatlik token (Function). Üretim notu: Netlify Identity / harici OIDC'ye geçiş.

## Seçenekler
localStorage (boyut sınırı, yapısal sorgu yok), Supabase/Firebase (ek hesap ve maliyet, demo için gereksiz).

## Ödünleşim
Blobs nihai tutarlılık modelidir; aynı anda iki yönetici kaydederse son yazan kazanır. Sürüm geçmişi bunu görünür kılar.
