# ADR-005: Modül (eklenti) sistemi

**Durum:** Kabul edildi

## Karar
İki katmanlı paket modeli, tek manifest sözleşmesi (`src/modules/types.ts › ModuleManifest`).
1. **İçerik paketi** (yalnız JSON): yeni etken grupları, listeler, metinler, kural profilleri. Ayarlar'dan `.json`/`.zip` yüklenir, kod değişmeden kart grubu çıkar.
2. **Hesap modülü** (kod + manifest): güneş, kaçınma gibi hesap içeren modüller. `src/modules/<id>/` altında, derleme zamanında kayıt defterine girer, Ayarlar'dan açılıp kapanır.

Modüller birbirine doğrudan import edilmez; yalnızca Dosya deposundaki **isimlendirilmiş alanlar** (`inputs[].from`, `outputs[]`) üzerinden okur/yazar. Kayıt defteri yüklemede sahipsiz girdi, döngü ve sürüm uyumsuzluğunu denetler. Kart önerileri (`hooks`) bilirkişi onayı olmadan karta yazmaz.

## Seçenekler
Monolit (reddedildi: Excel'ler ayrı ayrı gelecek), çalışma zamanı dinamik import ile uzak kod (reddedildi: güvenlik, Netlify statik).

## Ödünleşim
Yeni hesap modülü dağıtım gerektirir; içerik paketi gerektirmez.
