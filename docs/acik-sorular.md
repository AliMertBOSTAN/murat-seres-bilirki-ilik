# Açık Sorular

Bilinmeyen veya ürün sahibi kararı gereken noktalar. Her biri için geçici olarak **Excel'deki davranış korunur**.

| # | Soru | Geçici davranış | Karar |
|---|---|---|---|
| 1 | Durum kural profilleri birleştirilsin mi? (`birlesik` profili: Yetersiz→İNCELENMELİ, Belirsiz→İNCELENMELİ, Yapıldı→ETKEN DEĞİL, Davranış→İNCELENMELİ) | Sayfa bazlı Excel profilleri (`yol-cevre`, `arac`, `kisi`) | bekliyor |
| 2 | "ÖZEL İSTEMLİ" ve "İNCELEMELİ" (yazım hatası) ayrı durum mu, İNCELENMELİ'nin varyantı mı? sonuç1 sayacına girsin mi? | Ayrı durum olarak korunur; sayaç yalnız ETKEN + İNCELENMELİ sayar | bekliyor |
| 3 | Güneş modülü öneri eşlemesi: Tam körlük/Çok yüksek → Yetersiz, Yüksek → Belirsiz, Orta/Düşük → Yeterli | Varsayılan eşleme uygulanır, bilirkişi "Uygula" demeden karta yazılmaz | bekliyor |
| 4 | Sayfa 19 senaryo çarpanı AS=1→×5 doğru mu? (AS=2→×2, 3→×3, 4→×4) | Excel değeri korunur | bekliyor |
| 5 | Kurum kaçınma senaryolarında 0/5 anlamı (AM90–94, AM122–126) sürücü ile ters; hangisi doğru? | Excel korunur, düzeltme anahtarı var | bekliyor |
| 6 | 2. sayfa sıklık eşlemesi (5 Yıl→Günlük, 10 Yıl→5 Yıllık) kasıtlı mı? | Excel korunur | bekliyor |
| 7 | Rk formülü etiketle uyumlu hale getirilsin mi? | Excel formülü | bekliyor |
| 8 | İlçe kazası (`2.!N17`) gerçekte hangi veriden okunmalı? | AL sırası → BW (Excel) | bekliyor |
| 9 | KGM tablosundaki 5 araç sınıfı bloğunun adları (BB..BU) nelerdir? Satır 1 başlıkları yalnız YOGT/ORT.HIZ/%85/HIZ diyor. Yıl belirtilmemiş. | İndeksle saklandı (`siniflar[0..4]`); Rapor 2. sayfa "Kamyon hızı" = sınıf 5 (sütun 26/27) | bekliyor |
| 10 | Kullanılmayan 73 kütüphane başlığı (6., 7., 10., 11., 4.35.x, 8.11–8.15, 9.9–9.20) raporda gösterilsin mi? | `showInReport=false`, "taslak" etiketiyle; Ayarlar'dan açılır | bekliyor |
| 11 | Sürücü kartlarının 18'inde numara yok (SÜRÜCÜ REAKSİYON SÜRESİ vb.). Numaralandırma 5.5… şeklinde devam etsin mi? | `numbering.json` v1 şemasında sıra ile 5.5–5.22 önerilir | bekliyor |
| 12 | İki "2.22.5" (Eğimli Yol, Yaya Geçidi) ve iki "2.22" başlığı nasıl numaralansın? | ID'ler ayrı, görünen numara Excel'deki gibi | bekliyor |
| 13 | Giriş!M11 mahkeme no listesi (1–101) gerçekten mahkeme numarası mı? | İki alan: `mahkemeNo` (sayı) + `dosyaTuru` (ceza/hukuk/savcilik/icra) | bekliyor |
| 14 | `Grş 1!D108` "kullanım şekli" listesi kaynağı (`$B$967:$B$976`) yok; Tanım!C313:K313 (Belediye Otobüsü…) mi? | Tanım!C313:K313 önerilir, liste Ayarlar'da düzenlenebilir | bekliyor |
| 15 | Yaya kartları 9.6/9.7/9.9 hem Tanım hem BİLGİ HESAP'ta; hangisi bilgi bankası kaynağı? | Kart formüllerinin işaret ettiği kaynak; diğer kayıt `libraryRows`'ta | bekliyor |
| 16 | 2.9 "Kazanın Meydana Geldiği Yerin Konumu" kartı değer listesi `BİLGİ HESAP!B48:B56` (Yolun ortası…) ile `Grş 1!D49` ("1. Kuru") uyumsuz. Hangi liste? | Kart kendi seçimini kullanır (Excel `E93` sabit) | bekliyor |
| 17 | İl/ilçe merkez koordinatları (güneş modülü için) — veri kaynağı sağlanacak mı? | `data/reference/ilce-koordinat.json` yuvası boş; elle enlem/boylam | bekliyor |
| 18 | Dış dosyalar (`Trafik Kazası Bilirkişiliği 001.xlsb`, `EĞİTİM 10 KAÇINMA.xlsx`) sağlanacak mı? ZMN5/SRNK modüllerine dönüşecek. | Kaçınma modülü girdileri elle | bekliyor |
| 19 | Sayfa 2 "Resimler Dosyasına Git" köprüsü yerel .docx'e gider. Web'de ek dosya yükleme alanı yeterli mi? | Ek/görsel yükleme alanı (tarayıcı içi, IndexedDB) | bekliyor |
| 20 | Raporda "Aranmadı" kartları gizlensin mi? | Ayarlar: gizle / kısa / tam (varsayılan tam = Excel) | bekliyor |
| 21 | Yönetici kimlik doğrulama: demo parola (ADMIN_PASSCODE) yeterli mi, Netlify Identity'ye ne zaman geçilecek? | Demo: parola + imzalı token | bekliyor |
| 22 | TÜBİR logosu kullanım izni (kapakta görünür) | Excel'deki gibi kapakta | bekliyor |
| 23 | Örnek dosyadaki mahalle "CEBECİ" Bursa/İnegöl listesinde yok. Mahalle alanı serbest metin kalsın mı, yoksa listeyle sınırlansın mı? | Serbest metin + öneri | bekliyor |
