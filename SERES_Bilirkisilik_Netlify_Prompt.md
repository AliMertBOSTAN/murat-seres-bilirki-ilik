# CLAUDE CODE GÖREV PROMPTU
# SERESLER BİLİRKİŞİLİK — Excel Uygulamasının Netlify Web Uygulamasına Dönüştürülmesi

> Bu prompt, ekte verilen Excel dosyalarının **satır satır incelenmesiyle** hazırlandı. Aşağıdaki hücre adresleri, formüller ve sayılar gerçek dosyadan alındı. Bunları **kaynak gerçeklik** olarak kullan, ama her birini kendi çıkarım betiğinle tekrar doğrula.

---

## 0. ROLÜN VE HEDEFİN

Kıdemli bir full-stack mimar ve ürün tasarımcısı gibi çalış. Görevin, trafik kazası bilirkişiliği için Excel'de kurulmuş **SERESLER BİLİRKİŞİLİK** sistemini, Netlify'da çalışan **modüler, görsel olarak güçlü ve demo yapılabilir** bir web uygulamasına çevirmek.

Sistemin amacı: bilirkişinin işini sistematik hâle getirmek, hâkim ve avukatlara giden çıktıları standartlaştırmak, hataları önlemek ve zaman kazandırmak. Asıl değer **bilirkişilik içeriğinin eksiksiz ve doğru çalışmasıdır**:
- etken kartları,
- nedensellik bağları,
- ETKEN / ETKEN DEĞİL / İNCELENMELİ kararları,
- tespit yöntemi ve delil kodları,
- sorumlu tespiti,
- sonuç özeti.

Görsellik ikinci ama çok önemli bir hedef. Demo sırasında "ispat" mantığının, yani her sonucun hangi veriden ve hangi kuraldan geldiğinin, gözle görülebilmesi gerekiyor.

**Pazarlık konusu olmayan 6 ilke:**
1. **Çalışma mantığı bire bir.** Excel'deki her girdi → hesap → çıktı zinciri webde de aynı sonucu üretmeli. Bu, "altın test"lerle kanıtlanacak (§11).
2. **Sayfa yapısı korunacak.** Excel'deki sayfa sırası, sayfa rolleri ve başlık numaralandırması web navigasyonunda aynen yer alacak (§8).
3. **Bağ sistemi kırılmayacak.** Veriler birbirine bağlı. Bir girdi değişince ona bağlı tüm kartlar, özetler ve rapor anında güncellenecek.
4. **Nedensellik tabloları otomatik dolacak.** Kullanıcı bir başlıkta seçim yaptığında Açıklama / Nedensellik / Sonuç / Sorumlular / Tespit Yöntemi metinleri bilgi bankasından gelecek.
5. **Modüler yapı.** Güneş etkenliği, ayna, araç, kaza durumu gibi her ayrı Excel bir **modül/eklenti paketi** olacak. Paketler sonradan eklenip çıkarılabilecek.
6. **Ayarlar ayrı.** Kullanıcı (bilirkişi) yalnızca kendi doldurması gereken alanları görür. Yönetici (sistem sahibi) bilgi bankasını, listeleri, kuralları, katsayıları ve referans verileri Ayarlar'dan günceller.

---

## 1. KAYNAK DOSYALAR VE İLK İŞİN (FAZ 0: ANALİZ)

Depoda şu dosyalar olacak:

| Dosya | Rolü |
|---|---|
| `EĞİTİM 001.xlsx` (yüklenen adı `E__T_M_001.xlsx` olabilir, ~6,2 MB) | **Çekirdek sistem.** 18 sayfa. |
| `2.2_Gunes_Etkenligi_Model.xlsx` | **Örnek eklenti modülü.** Güneş parlaması (solar glare). 6 sayfa. Çekirdek dosyaya dış bağlantıyla bağlı. |

Kod yazmadan önce:

1. `scripts/extract/` altına Python (openpyxl ve ham XML okuma) çıkarım betikleri yaz. Bu betikler her sayfanın şunlarını JSON'a dökecek:
   - hücre değerleri ve formülleri,
   - birleştirilmiş hücreler,
   - **x14 uzantılı veri doğrulamaları.** openpyxl bunları atlar. `xl/worksheets/sheetN.xml` içindeki `<x14:dataValidation>` düğümlerini ham XML'den oku. Açılır listelerin büyük çoğunluğu burada.
   - **x14 koşullu biçimlendirmeleri** (renk kuralları),
   - görseller ve konumları (`xl/drawings/*.xml` + `_rels`),
   - köprüler (hyperlink), dış bağlantılar (`xl/externalLinks`), dizi formülleri (`FILTER`).
2. Aşağıdaki envanterle kendi çıkarımını karşılaştır. Fark varsa raporla.
3. `docs/excel-analysis.md` dosyasına bağımlılık grafiğini yaz: hangi sayfa hangi sayfadan hangi hücreyi okuyor.
4. Bu analize dayanarak `content/` altındaki JSON paketlerini **betikle üret.** Metinleri elle kopyalama. Bilgi bankasında binlerce satır uzun hukuki/teknik metin var. Hepsi eksiksiz taşınmalı.

### 1.1 Çekirdek dosya envanteri (doğrulama için)

| # | Sayfa | Boyut | Formül | Değer | Rol |
|---|---|---|---|---|---|
| 0 | `BİLGİ HESAP` | A1:AM1289 | 0 | 2.126 | **Bilgi bankası v2** ("GÜDÜL ÇALIŞMASI"). Etken açıklamaları, seçenek listeleri, renk skalası. Numaralandırma Tanım'dan farklı: sürücü = 4.x, araç = 5.x. |
| 1 | `Tanım` | A1:FC33525 | 99.914 | 307.104 | **Motor ve bilgi bankası v1.** Etken kütüphanesi, tüm listeler, referans veri setleri, bağımlı liste motoru. |
| 2 | `Giriş` | A1:Y39 | 2 | 16 | **Kapak ve dosya kimliği** (2 logo). |
| 3 | `Grş 1` | A1:S209 | 192 | 155 | **Ana veri girişi.** Taraflar, kaza yeri/zamanı, yol/çevre, 3 araç, 3 sürücü, 3 yaya, yolcular. |
| 4 | `1.` | A1:AE13 | 10 | 34 | Rapor s.1: **Açıklamalar** (Yargıtay dayanak metinleri). |
| 5 | `2.` | A1:AV408 | 42 | 227 | Rapor s.2: **Kaza yeri, zaman, istatistik ve risk** (Rn/Rt/Rk). |
| 6 | `3` | A1:AP298 | 493 | 501 | Rapor s.3: **Yol ve çevre etken kartları** (2.1–2.22.5, 30 kart). |
| 7 | `sonuç1` | A1:G13 | 1 + 4 dizi | 40 | **Sonuç özeti.** `FILTER` ile ETKEN ve İNCELENMELİ kartları toplar. |
| 8 | `4` | A1:AZ439 | 1.516 | 1.502 | Rapor s.4: **Araç etken kartları** (4.2–4.35, yan yana Araç 1 / Araç 2). |
| 9 | `5` | A1:AP231 | 388 | 420 | Rapor s.5: **Sürücü etken kartları** (5.1–4.23). |
| 10 | `6` | A1:AL109 | 123 | 132 | Rapor s.6: **Yolcu etken kartları** (8.x). |
| 11 | `9Y` | A1:AM109 | 119 | 134 | Rapor s.7: **Yaya etken kartları** (9.x). |
| 12 | `Sayfa5` | A1:D135 | 0 | 132 | **Delil kodu eşleme tablosu** (ENV-02 → ÇEV-02 …). |
| 13 | `Sayfa1` | — | 0 | 0 | Boş (3 şekil). Yok say, raporla. |
| 14 | `19` | B2:AV132 | 234 | 390 | **Kazadan kaçınma ve kusur puanlaması** (mütalaa). Dış dosyalara bağlı. |
| 15 | `Sayfa2` | — | 0 | 0 | Boş. |
| 16 | `Sayfa3` | A1:D91 | 0 | 240 | Bilgi bankası: **araç grubuna göre sürüş eğitimleri.** |
| 17 | `Sayfa4` | A1:G16 | 3 | 47 | Bilgi bankası: **yetki belgesi türleri** (C1, C2, K1, L1, D1 …). |

Tanım'daki formül yoğunluğu (bağımlı liste motoru): `COUNTIF` 72.138, `IFERROR` 14.596, `VLOOKUP` 14.594, `ROW` 8.194, `CONCATENATE` 4.194. Bu formüllerin **webde formül olarak taşınması gerekmez.** Yaptıkları işi (bağımlı listeler ve aramalar) veri indeksleriyle yeniden kur (§4, ADR-002).

---

## 2. EXCEL'İN ANATOMİSİ (BULGULAR)

### 2.1 Veri akışı

```
                    ┌──────────────────────────── Tanım (kütüphane + referans veri + listeler) ───────────┐
                    │                              BİLGİ HESAP (kütüphane v2 + listeler + renk skalası)   │
                    ▼                                                                                     ▼
Giriş (dosya kimliği) ──► Grş 1 (ana veri girişi) ──► 2. (yer/zaman + istatistik/risk)
     │  il/ilçe/mahalle,        │                    ──► 3  (yol-çevre kartları) ──► sonuç1 (ETKEN/İNCELENMELİ özeti)
     │  mahkeme, suç türü       │                    ──► 4  (araç kartları)
     │                          │                    ──► 5  (sürücü kartları)
     └──► 1. (açıklamalar)      │                    ──► 6  (yolcu kartları)
                                │                    ──► 9Y (yaya kartları)
                                └──► 19 (kazadan kaçınma) ◄── [dış] "Trafik Kazası Bilirkişiliği 001.xlsb" (ZMN5, SRNK, İŞRNK, BRYR …)
                                                         ◄── [dış] "EĞİTİM 10 KAÇINMA.xlsx" (Grş 1)
3 sayfası V9 / V19 köprüleri ──► [eklenti] 2.2_Gunes_Etkenligi_Model.xlsx (model!A1, Vaka_Girişi!A1)
Güneş dosyası ──► [dış] EĞİTİM 001.xlsx (Tanım, Giriş): başlık bloğu ortak meta verisi
```

Sayfa zinciri köprüleri: her rapor sayfasının başlığında (F2:N2) bir sonraki sayfaya köprü var: `2.→3.`, `3→4`, `4→5`, `5→6`. Not: `2.` sayfasındaki köprü `'3.'!A1`'i hedefliyor ama sayfanın adı `3`. Köprü kırık. `19` sayfası `Giriş` ve dış `ÇVNK` sayfasına köprü veriyor. `2.` sayfasında "Resimler Dosyasına Git" köprüsü yerel .docx dosyalarına gidiyor; webde bunun karşılığı ek dosya / görsel yükleme alanı olacak.

### 2.2 Giriş (dosya kimliği): alanlar ve liste kaynakları

| Hücre | Alan | Liste kaynağı |
|---|---|---|
| J2:R3 | Kurum/firma başlığı | `Tanım!E86:E113` (SERESLER BİLİRKİŞİLİK, Murat Rasim SERES, Mehmet ÖNEL BİLİRKİŞİLİK …) |
| J4:R5 | Rapor türü | `Tanım!E2:E7` (BİLİRKİŞİ RAPORUDUR / UZMAN GÖRÜŞÜDÜR …) |
| M7 | Personel | `Tanım!E86:E108` |
| M8 | İl | `Tanım!G4:G85` (81 il) |
| M9 | İlçe (**bağımlı**) | `Tanım!AD3:AD92` (seçilen ile göre dinamik) |
| M10 | Mahalle/köy (**bağımlı**) | `Tanım!AF3:AF150` (seçilen ilçeye göre dinamik) |
| M11 | Mahkeme no / dosya türü seçici (1–4) | `Tanım!F62:F162` |
| N11 | Mahkeme adı | `Tanım!B46:B61` (AĞIR CEZA, ASLİYE CEZA, SULH CEZA, ASLİYE HUKUK …) |
| J12 / J13 | DOSYA NO / SUÇ etiketleri | `=Tanım!B61`, `=Tanım!B62` |
| M13 | Suç / kaza türü | `Tanım!D60:D76` (Araç Kazası, Yaya Kazası, Araç Ticari …) |

**Bağımlı liste motoru (Tanım):**
- İl → ilçe: `AG:AK` (995 satır il-ilçe). Anahtar `AH = COUNTIF(AG$3:AG3,AG3)&AG3`, yani "n.sıra + il adı".
- İlçe → mahalle: `CR:CZ` (33.523 satır il > ilçe > mahalle). Anahtar `CV = sıra & UPPER(ilçe)`, sonuç `AF = VLOOKUP(AE,CV:CX,3,0)`.

Webde bunun yerine `data/reference/il-ilce-mahalle.json` ve indeksli `getIlceler(il)` / `getMahalleler(il, ilce)` kullan. Büyük harf/küçük harf eşleşmesini **Türkçe yerel ayarla** yap (`toLocaleUpperCase('tr-TR')`).

### 2.3 Grş 1 (ana veri girişi)

- **Başlık etiketleri dosya türüne göre değişir:**
  `B6:B20 = IF(D="", "", IF(B$1=1, Tanım!A65, IF(B$1=2, Tanım!B65, IF(B$1=3, Tanım!C65, Tanım!D65))))`.
  `Tanım!A64:D79` dört etiket setini tutar:
  - Ceza Mahkemesi: DOSYA NO, MÜŞTEKİ/MAĞDUR, /KATILAN, VEKİLİ, SANIK …
  - Hukuk: DOSYA NO, DAVACI, DAVACI VEKİLİ, DAVALI …
  - Cumhuriyet Başsavcılığı: SORUŞTURMA NO, MÜŞTEKİ/MAĞDUR, VEKİLİ, ŞÜPHELİ …
  - İcra: DOSYA NO, ALACAKLI, … BORÇLU …

  `B1 = Giriş!M11`.
- Tarih (D27) → **haftanın günü** (D28) `WEEKDAY` ile Türkçe gün adına çevrilir (1=PAZAR … 7=CUMARTESİ).
- İl/ilçe Giriş'ten gelir (D30, D31).
- Başlık metinleri `Tanım!B250…B301`, `B304…B376`, `B685` vb. satırlardan gelir. Her girdi satırının başlığı kütüphaneden gelir.
- **Varlık sütunları:** D/E/F = 1./2./3. araç, sürücü, yaya. Araç bilgileri satır 100–132 (plaka, model yılı, cins, motor gücü, kullanım amacı, kamera, hız, fren uzunluğu, yük cinsi, istihap, ilk darbe bölümü, sigorta bilgileri, fenni muayene, hasar, yakıt, lastik, cam, dikiz ayna, araç sahibi …). Sürücü 133–147 (TCKN, doğum, cinsiyet, kaza sonucu, belge durumu/il/ilçe, adaylık, öğrenim, alkol, psiko-fiziksel şüphe, koruyucu tertibat, meslek). Yaya 154–165. Yolcu 166–175.
- Yerel listeler: I136:L136 cinsiyet (ERKEK/KADIN/EKS), I137:M137 kaza sonucu (SAĞLAM/YARALI …), I141:M141 adaylık (ADAY/SÜRÜCÜ), I143:K143 alkol (O "Sıfır", BELİRSİZ, TESPİT EDİLEMEDİ …), I144:P144 var/yok/yetersiz.
- Önemli x14 listeleri:

  | Hücreler | Kaynak |
  |---|---|
  | D42 gün durumu | `BİLGİ HESAP!B4:B13` |
  | D43 hava | `Tanım!B395:B408` |
  | D44 yol sınıfı | `Tanım!B413:B428` |
  | D45 akış yönü | `Tanım!B432:B435` |
  | D47 | `Tanım!C271:Q271` |
  | D49 | `Tanım!C270:L270` |
  | D75:D96, D107, D114, D123 (inceleme durumu) | `Tanım!D23:D32` |
  | D89 kaza türü | `Tanım!C294:R294` |
  | D90 araç sayısına göre | `C295:H295` |
  | D91 ilk çarpışma yeri | `C296:N296` |
  | D104 araç cinsi | `BİLGİ HESAP!D513:X513` |
  | D106 kullanım amacı | `Tanım!B982:B991` |
  | D112 yük cinsi | `Tanım!B1086:B1096` |
  | D139 belge durumu | `C344:H344` |
  | D140 belge ili | `G4:G85` |
  | D143 öğrenim | `C347:H347` |
  | D21 inceleme türü | `C83:C88` |
  | D22 görevlendirme dayanağı | `C90:C96` |

### 2.4 ETKEN KARTI: sistemin çekirdek deseni

Rapor sayfaları 3, 4, 5, 6 ve 9Y'nin her biri **aynı yapıda bloklardan** oluşur. Bu bloğa webde **Etken Kartı (FactorCard)** de. Her blok yaklaşık 10 satırdır (örnek: sayfa 3, satır 29–37, "2.3 HAVA DURUMU"):

| Satır | Sol (B) | Değer (E…) | Orta (H…) | Sağ (V…) |
|---|---|---|---|---|
| Başlık | `=Tanım!B393` → "2.3. HAVA DURUMU" | | | **Ek dosya bayrağı:** `IF(İnceleme="Aranmadı", "", Tanım!E393 & Tanım!F393)` → "2.3. Ek dosya hazırla" |
| Değer | alt başlık (Tanım) | **Seçilen değer** `='Grş 1'!D43` → "Açık ve Güneşli" | `değer & " Durumu"` | "Kazada Durumu" |
| İnceleme Durumu | `=Tanım!$B$41` | **Kullanıcı seçer** (`Tanım!D23:D32`: Yeterli, Yetersiz, Var, Yok, Yapıldı, Aranmadı, Belirsiz, Davranış) | **Kazada durumu cümlesi:** `IF(s ∈ {Aranmadı, Var}, Tanım!H[satır] (uygunluk metni), değer & " " & Tanım!G[satır] (önlem metni))` | **DURUM KARARI** (kural tablosu, §2.5) |
| Açıklama | `=Tanım!$B$38` | `VLOOKUP(değer, Tanım!B394:J406, 3, 0)`, yani seçeneğe özel açıklama | | |
| Nedensellik | `=Tanım!$B$39` | `VLOOKUP(değer, Tanım!B394:J406, 2, 0)`, yani seçeneğe özel nedensellik bağı | | |
| Müteala | `=Tanım!$B$40` | **Kullanıcının serbest metni** (mütalaası) | | |
| Sorun açıklama | `=Tanım!$B$42` | `IF(durum ∈ {İNCELENMELİ, ETKEN, Davranış}, Tanım!J[satır], Tanım!I[satır])` | | |
| Tespit Yöntemi | `=Tanım!$B$43` | E/H/K: 3 yöntem seçimi (`Tanım!C96:C110`: Olay tutanakları, Kamera kayıtları, Tanık ifadeleri, Takograf verileri, Meteoroloji, Astronomi, Belirsiz, Tespit edilemedi). N: "Delil Kodu". P: **delil kodu** (`Tanım!C2000:C2080`, örn. ÇEV-02, YOL-06, ÇRP-01, GRŞ-02, ZMN-KYN-02, OBS-01). Q:T: **4 puan hücresi** (`Tanım!D/E2000:2080`). | | U/X: "Tespit doğrulama": Doğrulandı / Belirsiz (`Tanım!B107:B111`) |
| Sorumlu Tespiti | `=Tanım!$B$44` | `Tanım!E40:E60`: Sorumlu Yok, Sürücü, Yaya, Yolcu, Araç Sahibi, Bakım Onarım, Yolun/Mal Zilyeti, Üretici Firma, Denetleyiciler, Tesis Kurum Kuruluşlar, Çevre Şehirci, TEK, Kanun Yöntmlk, Sigorta Şirketi, 3. Kişiler, Sorumlu tespit edilemedi, Kolluk ve Adalet sorgusu | | P/S: **Hâkim/Savcı Tespit** (`Tanım!D37:D45`: Kolluk / Savcılık / Bilirkişi / Uzman tarafından araştırılmasına …, Aranmadı) |

Bazı kartlarda Açıklama ve Nedensellik, seçeneğe özel `VLOOKUP` yerine **etkene ait sabit metinden** gelir (`=Tanım!D431`, `=Tanım!C431`, `=Tanım!E431` "Sonuç:"). Bazı kartlarda `BİLGİ HESAP` tablolarından ek "Açıklama" satırı vardır (örn. 3!E48 `VLOOKUP(V39, 'BİLGİ HESAP'!B32:D40, 2, 0)`).

Bunun kuralı şu: **Kart şablonu tek.** Metnin seçenek düzeyinden mi etken düzeyinden mi geleceği etken tanımında bir alan olarak belirtilir.

**Kütüphanedeki etken satırı yapısı (Tanım):**
- Başlık satırında (örn. satır 377 "2.1. GÜN DURUMU"):
  - C = "Aranan: …"
  - E = kod öneki ("2.1. ")
  - F = "Ek dosya hazırla"
  - G = önlem metni ("Yönetmeliğe uygun güvenlik önleminin alınması")
  - H = uygunluk metni ("… önlemi alınmıştır.")
  - I = nedensellik yok metni ("Ek dosya düzenlemesinde Nedensellik bağı bulunamamıştır.")
  - J = sorun metni
  - K = "Ek dosya hazırlayınız"
- Alt satırda (378): C = Nedensellik Bağı, E = Sonuç, F = Sorumlular, G = Tespit Yöntemi (genel).
- Seçenek satırları (379+): B = seçenek, C = nedensellik, D = açıklama.
- **Dikkat:** Sürücü/yolcu/yaya bölümlerinde (satır 685+) A sütununda numara olduğu için sütunlar **3 sağa kayar.** Kod H'de, "Ek dosya" I'da, önlem J'de, uygunluk K'da, L/M/N'de devamı, seçenek listesi O'da.

  Çıkarım betiği her bölüm için sütun eşlemesini algılamalı ve tek bir şemaya normalize etmeli (§5).

**Kütüphanenin kapsamı:** Tanım'da 250–1746 arasında **252 numaralı başlık** var. Bunların **92'si hiçbir rapor sayfasında kullanılmıyor.** Bunlar:
- Dorse 4.35.5–4.35.13,
- **6. Araç yüküne ait izler**,
- **7. Lastik, kayma, sürüklenme, fren izleri** (7.1–7.11),
- yolcu 8.11–8.15,
- yaya 9.9–9.20 (illiyet bağları dahil),
- **10. Ölü-yaralıya ait izler**,
- **11. Kaza nedeni mütalaası** (şiddet düzeyi, gerçek/olası/temel neden, tedbir).

Web uygulaması kartları **kütüphaneden veri odaklı üreteceği için** bu bölümler de render edilebilecek. Böylece bilirkişilik kısmı eksiksiz olur. Ayarlar'dan "raporda göster" anahtarı ver. Varsayılan olarak Excel'de görünenler açık, diğerleri "taslak" etiketiyle kapalı olsun. Demo için tek tıkla açılabilsin.

### 2.5 Durum karar kuralları (V sütunu)

Excel'de `=` karşılaştırması **büyük/küçük harf duyarsızdır** ve Türkçe yerel ayarda çalışır. Kayıtlı değerler bunu doğruluyor: `"Yetersiz"` girdisi `"YETERSİZ"` dalına düşüyor. Webde karşılaştırmayı `trim()` + `toLocaleUpperCase('tr-TR')` ile yap.

**Üç farklı kural varyantı var** (sayfadan sayfaya tutarsız):

| İnceleme Durumu | Sayfa 3 (yol-çevre) | Sayfa 4 (araç) | Sayfa 5, 6, 9Y (kişi) |
|---|---|---|---|
| (boş) | "" | "" | "" |
| Yeterli | ETKEN DEĞİL | ETKEN DEĞİL | ETKEN DEĞİL |
| Yetersiz | **İNCELENMELİ** | **ÖZEL İSTEMLİ** | **İNCELENMELİ** |
| Aranmadı | ETKEN DEĞİL | ETKEN DEĞİL | ETKEN DEĞİL |
| Yok | ETKEN | ETKEN | ETKEN |
| Davranış | İNCELENMELİ | *(tanımsız → FALSE)* | *(tanımsız → FALSE)* |
| Var | ETKEN DEĞİL | ETKEN DEĞİL | ETKEN DEĞİL |
| Belirsiz | İNCELENMELİ | **"İNCELEMELİ"** (yazım hatası) | **ÖZEL İSTEMLİ** |
| Yapıldı | *(tanımsız → FALSE)* | *(tanımsız)* | *(tanımsız)* |

Ayrıca:
- "Kazada durumu cümlesi" (H) de varyantlı. Sayfa 5'te: `Var→K, Yok→J, diğer→değer & H(alt satır)`. Sayfa 6/9Y'de: `Var→…, Yok→…, diğer→birleştir`.
- "Ek dosya bayrağı" sayfa 4'te hem `Var` hem `Aranmadı` için boş, sayfa 3'te yalnız `Aranmadı` için boş.

**Uygulama:** Kuralları **veri olarak** tut: `content/core/rules/status-profiles.json` içinde `yol-cevre`, `arac`, `kisi` profilleri. Her etken grubunun bir profili olsun. Varsayılan değerler Excel'i bire bir yansıtsın ("Excel uyumlu mod"). Ayarlar'da bir **"Tutarsızlık Raporu"** ekranı bu farkları göstersin. Yönetici tek tıkla "birleştirilmiş kural" profiline geçebilsin. Tanımsız durumlar (FALSE) arayüzde "⚠ Kural tanımsız" rozeti olarak görünsün, sessizce yutulmasın.

**Renk kodları** (Excel koşullu biçimlendirmesinden; beyazdan renge radyal gradyan):

| Değer | Renk |
|---|---|
| ETKEN, Yok | `#FF0000` (kırmızı) |
| ETKEN DEĞİL, Yeterli, Var, Aranmadı | `#92D050` (yeşil) |
| İNCELENMELİ, Yetersiz | `#00B0F0` (camgöbeği) |
| Davranış, Belirsiz | tema accent1 (mavi) |
| ÖZEL İSTEMLİ | tema dk2 `#44546A` %60 açık |

5'li skala (`BİLGİ HESAP!B71:B75`, şerit çizgisi vb.): Çok İyi `#00B050` · İyi `#92D050` · Normal `#00B0F0` · Kötü `#FFC000` · Çok Kötü `#FF0000`.

`2.` sayfasındaki risk bantları 0–5 / 6–10 / 11–15 / 16–20 / 21–25. Tanım'da ölçek bantları 0–2,5 / 2,5–3,5 / 3,5–4 / 4–4,5 / 4,5–9 ve 1,2–1,7 / 1,7–5. Bu renkleri durum çiplerinde ve rapor çıktısında aynen kullan.

### 2.6 sonuç1 (sonuç özeti)

- `A1 = COUNTIF('3'!V:V,"ETKEN") + COUNTIF('3'!V:V,"İNCELENMELİ")`. Örnek dosyada **10.**
- B4:G13 dizi formülleri:
  `FILTER(IFERROR('3'!B1:B4998,""), (TRIM('3'!V3:V5000)="ETKEN") + (TRIM('3'!V3:V5000)="İNCELENMELİ"), "")`.
  Kaydırmalı aralıklar kullanılmış: B kart başlığını (V'nin 2 satır üstü), V durumu, F `E6:E5003` ile müteala satırını (3 alt), G `E1:E4998` ile başka bir satırı alıyor.

Webde bunu açık alanlarla yap: `{başlık, durum, müteala, …}`. Örnek dosyadaki beklenen 10 satır (başlık → durum):
- 2.1 GÜN DURUMU → **ETKEN** (müteala "murat rasim seres")
- 1.4 SAAT/DAKİKA → İNCELENMELİ
- 2.3 HAVA DURUMU → İNCELENMELİ
- 2.4 YOLUN SINIFI → İNCELENMELİ
- 2.6 KAPLAMA TİPİ → İNCELENMELİ
- 2.7 Yolun Yüzeyi → **ETKEN**
- 2.8 YOL YÜZEY HATALARI → İNCELENMELİ
- 2.10 ÇEVRE ÖZELLİĞİ → İNCELENMELİ
- 2.13 yol elemanları → İNCELENMELİ
- 2.22.3 Düz Yol → **ETKEN** (F sütunu "sakıncası yok")

**Excel yalnız sayfa 3'ü özetliyor.** Webde özet tüm grupları (yol-çevre, araç, sürücü, yolcu, yaya, modüller) kapsasın. Kapsam Ayarlar'dan seçilebilsin. "Excel uyumlu" görünümde yalnız sayfa 3.

### 2.7 Sayfa 2. (kaza yeri, istatistik, risk)

**Girdiler:**
- Tarih/gün/saat/il/ilçe/mahalle (Grş 1 ve Giriş'ten),
- olay saati M13, inceleme başlama Q13, ambulans geliş U13, ihbar Y13,
- **Yol No / Kesim No** J15 (örn. `750-09.0`, liste `Tanım!AP2:AP53`),
- yön U15 (1–… "Yönlü"), hareket X15 ("Hareketli"),
- yaya katsayısı U17 (11), araç katsayısı X17 (6), liste `Tanım!AB2:AB27`.

**Aramalar:**
- `E14` il nüfusu = `VLOOKUP(il, Tanım!BY4:CH5000, 10)`
- `E15` ilçe nüfusu = `VLOOKUP(ilçe, Tanım!DE2:DF975, 2)`
- `E16` il araç = `VLOOKUP(il, BY:CH, 3)`
- `E17` il kaza = `VLOOKUP(il, BY:CB, 2)`
- `O15` yolu kullanan araç (KGM) = `VLOOKUP(J15, Tanım!AT4:BX5000, 8)`
- `R15` yol km = `…, 6`
- `R17` yol kazası = `…, 31`
- `AC17` kamyon hızı = `…, 26`
- `AG17` = `…, 27`
- `N17` ilçe kazası (5 yıllık) = `VLOOKUP(il, Tanım!AL3:BX5000, 38)`

**Formüller:**
- Rn (nüfus kaza oranı) `B24 = E17 * D23 / E14 * 100`
- Rt (taşıt kaza oranı) `J24 = E17 * D23 / E16 * 100`
- Rk (km kaza oranı) `R24 = IF(R15="Belirsiz", "", R15 * D23 / O15 * 100)`
- Sabitler: D23=1, G23=10.000, K23=100.000, O23=10.000.000. Etiketler "Rk = D×100×10 000 000 / S×M×365" diyor ama formül bunu uygulamıyor. **Excel'deki hesabı koru**, farkı tutarsızlık raporuna yaz.

**Risk/sıklık zinciri:**
- `AC12 = 0,0035`
- `AC13 = U15 × X15 × AC12`
- `AC14 = AC13 × U17`
- `AD14 = AC14 × sıklık(E63) × J63`
- `AC15 = X17 × AC13`
- `AD15 = AC15 × J64`
- Sıklık tablosu `AD2:AE10`: Günlük 2,5 · 1 Haftalık 2,1 · 1 Aylık 1,8 · 3 Aylık 1,5 · 6 Aylık 1,2 · 1 Yıllık 0,85 · 5 Yıllık 0,45 · 10 Yıllık 0,12.

**Metin blokları** (seçilebilir listeler, E37:N83 ve R37:Z83): yolda oluşabilecek kaza çeşitleri, maddi/manevi kayıplar, çevreye zararlar, İSG sonuçları, eğitimler, yolun kazaya etkisi, olası sıklık (araç/yaya), yoldaki eksiklikler, önleme önerileri, yoğun araç cinsleri, kazaya yardım, kazaya güvenlik, yardım zamanlaması, önlenebilecek kazalar (ağırlıklarla: Yandan çarpma 0,5, Arkadan 0,5, Devrilme 0,2). Ayrıca GEREĞİ İÇİN / BİLGİ İÇİN dağıtım listesi.

**Referans veri setleri (Tanım):**
- `G:I` il nüfusu ve taşıt sayıları (2023/2024)
- `J:Q` taşıt türleri
- `R:AA` kaza/yaralı/ölü istatistikleri
- `AU:BX` **KGM trafik sayım tablosu**, 4.097 yol kesimi: BL.NO, İLİ, KKNO, UZUNLUK KM, SAYIM TÜRÜ, TOPLAM, YOGT, ORT.HIZ, %85'lik HIZ (araç sınıflarına göre tekrar eden bloklar), AĞIR TAŞIT %, İlçe Kz Say, Yol Kaza Sayısı. Anahtar AT = KKNO + "." + …
- `BY:CN` il istatistikleri: 82 satır, oranlar `CI = BZ×CI1/CA×100` …
- `DD:DI` ilçe nüfusu (973 satır)

Bunları `data/reference/*.json` olarak ayır, yıl/sürüm etiketi ver. Ayarlar'dan **CSV/XLSX yükleyerek güncellenebilsinler** (yeni yıl verisi gelince).

### 2.8 Sayfa 1. (açıklamalar)

Yargıtay 15. HD 10.11.2016, 2015/5127 E. – 2016/4635 K. kararı ve HMK 27, Anayasa 36, AİHS 6 atıflı 5 paragraflık metin (`Tanım!B83:B94`). Rapor türüne göre üç varyant var (`Tanım!B81:D81`: UZMAN GÖRÜŞ İTİRAZ / BİLİRKİŞİ YE İTİRAZ / BİLİRKİŞİ RAPORU). Rapor türü seçimiyle doğru metin gelsin. Metinler Ayarlar'dan düzenlenebilsin.

### 2.9 Sayfa 19 (kazadan kaçınma ve kusur): ayrı modül

- Hız: `V = ((Tt × y) / t) / m` → `AF10 = ((R10×3600)/V10)/1000`. Örnek: y=7,5 m, t=0,67 s → **40,30 km/s**. `AI10 = R10/V10` = 11,19 m/s.
- 5 kaçınma senaryosu (sola, sağa, durup-fren, ileri hızlanma, normatif hız). Her biri için AS puanı (0–5):
  - `AM = IF(AS=0, "KAZADAN KAÇINAMAZ", IF(AS=5, "KAZADAN KAÇINMA", IF(AS>0, "KAZADAN KAÇINABİLİRDİ", "")))`
  - `AR = AR12/5 × k` (AS=1→×5, 2→×2, 3→×3, 4→×4; 0 ve 5→0)
  - `AM19 = SUM(AR13:AR17) × AH21`
  - AR12 temel kusur puanı dış dosyadan gelir (`SRNK!AS47` = 791).
- Kurum kaçınması (satır 115+): `AR121 = O119 × bilgi süresi çarpanı` (1 Ay 1,1 · 3 Ay 1,3 · 6 Ay 1,5 · 12 Ay 1,7 · işleme alınmamış 2), O119=280.
- **Hata:** `AM122`'de 0 ve 5'in anlamı satır 13–17'nin tersi (0→KAÇINMA, 5→KAÇINAMAZ).
- Kaynakları dış dosya `Trafik Kazası Bilirkişiliği 001.xlsb`. O dosyanın sayfaları (gelecekteki modül adayları): Tanım, Giriş, **KVŞ** (kavşak), YOL, ARC, YLC, YAY, KRK2, NHZ3, HZD4, **ZMN5** (zaman-mesafe), İLB6, KZND7, YYNK01, YLC 8, 1./2./3.SRC8x, **SRNK**, SKKİ, TKSR, KŞDZ, KNAT, İSTEM, BLRKŞ, İŞRNK, BRYR, MTSKLT, 4.12, 4,13, 4.2.1, **GNŞ1** (güneş), Srcgz, ÇVNK, **AYNA**, PRKN, illi, cezaMd, mesyet, KSRSÇ.
- Bu dosya elimizde yok. Modülün girdilerini (aldığı yol, süre, temel kusur puanı) **elle girilebilir** yap. İleride ZMN5/SRNK modülü eklenince otomatik bağlansın.

### 2.10 Görseller ve sayfa başlığı

**Logolar** (`xl/media`):

| Dosya | İçerik | Kullanıldığı yer |
|---|---|---|
| `image1.png` (473×682) | **SB BİLİRKİŞİLİK "Adaletin Güvencesi"** (kılıç/terazi motifli, lacivert-camgöbeği-bronz, krem zemin) | Sayfa 1., 2., 4, 6 ve Giriş |
| `image2.png` (261×196) | **TÜBİR – Türkiye Bilirkişilik Birliği** (altın zemin, turkuaz) | Giriş kapağı |
| `image3.png` (663×675) | **SB BİLİRKİŞİLİK** sade varyant | Sayfa 3, 5, 9Y |

`.wdp` dosyaları HD Photo eşlikçileri. PNG'leri kullan, şeffaflığı koru. Logoları `public/brand/` altına çıkar. Ayarlar'dan değiştirilebilsinler.

**ISO tipi doküman başlığı** (her rapor sayfasında satır 2–6). Sol: logo. Orta: firma adı + rapor türü (F2:N4). Sağ:
- Dok.No (`Tanım!C9` "TRF.06.AC.E.25..012.")
- Sayfa No x / y
- Haz.Tarihi (`C11`)
- Revizyon No (`C15` "24/01.")
- Rvzyn Tarihi (`C16`)
- İso Belge (`C12` "Alınmadı")
- Bağ.Ol.Ay-Gün (`TODAY()`)
- Yıl
- Klasör No
- Arşiv Yeri

Alt satırda Birim ("SEÇG-K Büro"), Konu (`C6` "Yaralamalı Maddi Hasarlı Trafik kazası"), Yenileyen.

**Altbilgi** (Tanım B16–B23): Yenileyen, Onaylayan, Yenilenme / Onaylanma Tarihi, **"NOT: BU SAYFAYI İLGİLİ OLDUĞU DÖKÜMANDAN AYIRMAYINIZ"**.

Rapor sayfa başlığı: `B8 = Giriş!M11 & " " & Giriş!N11 & " " & Giriş!J4` → "3 AĞIR CEZA MAHKEMESİ BİLİRKİŞİ RAPORUDUR".

**Yazı tipleri:** Rapor gövdesi ağırlıklı **Times New Roman** (70 stil). Yanında Arial, Calibri.

---

## 3. TESPİT EDİLEN HATALAR VE TUTARSIZLIKLAR

Hiçbirini sessizce düzeltme. Her biri için:
- **(a)** "Excel uyumlu" davranışı uygula (altın testler bunu doğrular),
- **(b)** düzeltilmiş davranışı bir **ayar anahtarı** ile hazırla,
- **(c)** `docs/tutarsizlik-raporu.md` dosyasına ve uygulamadaki "Tutarsızlık Raporu" ekranına yaz.

Ürün sahibi hangisinin geçerli olacağına karar verecek.

**Bilinmeyen bir şey varsa** (bir hücrenin amacı, beklenen bir değer, eksik bir kaynak dosya) tahminle ilerleme. `docs/acik-sorular.md` dosyasına not et ve geçici olarak Excel'deki davranışı koru.

1. **Sayfa 4, Araç 2 sütunu kırık.** AB…AX sütunları kopyala-yapıştır ile kaydırılmış göreli referanslar içeriyor: `Tanım!AB960`, `Tanım!AJ955`, … Bu yüzden il verisi çekiyor ("952Bursa", "Ardahan", "Iğdır"). Ayrıca `'Grş 1'!AD…` okuyor, oysa Grş 1'de 2. araç **E** sütununda. Webde araç bir dizi varlık. Aynı kart şablonu her araç için doğru verilerle render edilmeli. Excel uyumlu modda bile Araç 2'yi doğru göster ve farkı raporla.
2. **Kapasite uyumsuzluğu.** Grş 1 üç araç, üç sürücü, üç yaya ve yolcular alıyor. Rapor sayfaları 1–2 varlık gösteriyor. Webde varlık sayısı dinamik olsun (Ayarlar'da üst sınır varsayılan 6).
3. **Durum kuralı varyantları** ve tanımsız "Yapıldı"/"Davranış" dalları (§2.5). "Davranış" çıktısını kontrol eden dallar ölü kod; durum hiçbir zaman "Davranış" üretmiyor.
4. **Giriş!M11 aşırı yüklenmiş.** Hem "3. Ağır Ceza" mahkeme numarası hem de etiket seti seçici (1=Ceza, 2=Hukuk, 3=Savcılık, 4=İcra). Örnekte 3 seçildiği için Ağır Ceza dosyasında **Savcılık etiketleri** (SORUŞTURMA NO, ŞÜPHELİ) çıkıyor. Webde iki ayrı alan olsun: `mahkemeNo` ve `dosyaTuru`.
5. **2. sayfa sıklık eşlemesi.** `AD14`'te "5 Yıl" → AD2 (Günlük, 2,5), "10 Yıl" → AD9 (5 Yıllık, 0,45) eşlenmiş. Muhtemelen AD9 ve AD10 olmalıydı. AD14 yaya katsayısını (U17) "araç sıklığı" (E63) ile çarpıyor. AD15'te yaya sıklığı (E64) hiç kullanılmıyor.
6. **2. sayfa Rk etiketi ile formül uyuşmuyor** (§2.7).
7. **Sayfa 19, AM122** senaryo puan anlamı ters. AS=1→×5 eşlemesi şüpheli.
8. **Kırık referanslar:** `3!V281 = #REF!`. 5, 6 ve 9Y'de T3 veri doğrulaması `#REF!`. Sayfa 3'teki bazı koşullu biçimlendirmeler `'Grş 1'!#REF!`. `5!I10 = #NAME?`. `5!I11 = Giriş!C99` (boş hücre). `2.` sayfasından `'3.'` köprüsü kırık.
9. **Numaralandırma tutarsız.**
   - Tanım'da sürücü 5.x / araç 4.x, BİLGİ HESAP'ta sürücü 4.x / araç 5.x.
   - 9Y'de "4.3 Cinsiyeti - Yaşı".
   - 6'da "6.3" ile "8.x" karışık.
   - İki ayrı "2.22 YOLUN ÖZELLİĞİ / YAPI ÖZELLİĞİ".
   - İki "2.22.5".

   Webde her etkenin **değişmez bir ID'si** olsun (örn. `yol.gun-durumu`). Görünen numara Ayarlar'daki numaralandırma şemasından üretilsin.
10. **Kopya metinler.** Yol sınıfı kartının Müteala alanında "havanın uygun olması nedeniyle…" metni tekrar ediyor (3!E44). Müteala kullanıcı alanıdır. Örnek veriyi taşıma, boş başlat.
11. **3!V39 elle girilmiş** ("İki Yönlü Yol"), formül değil. Bunu açık bir alt seçim alanı olarak modelle.

---

## 4. HEDEF MİMARİ: MİMARİ KARAR KAYITLARI (ADR)

Her ADR'yi `docs/adr/ADR-00X.md` olarak bu formatta kaydet: Bağlam / Karar / Seçenekler / Ödünleşim / Sonuçlar / Eylem maddeleri.

### ADR-001: Uygulama tipi ve barındırma
**Bağlam:** Netlify, demo odaklı, sunucu maliyeti olmamalı, çevrimdışı da çalışabilmeli.
**Karar:** **Vite + React 18 + TypeScript** statik SPA. Netlify'da yayın. Sunucu ihtiyacı yalnızca merkezi Ayarlar için. Bunu **Netlify Functions + Netlify Blobs** ile çöz.

| Seçenek | Karmaşıklık | Maliyet | Ölçek | Not |
|---|---|---|---|---|
| **A. Vite SPA + Functions (seçilen)** | Düşük | ~0 | Yeterli | Hızlı, çevrimdışı destekli, basit dağıtım |
| B. Next.js (SSR) | Orta | Düşük | Yüksek | SSR gereksiz, Netlify adaptörü ek karmaşıklık |
| C. Excel'i tarayıcıda olduğu gibi çalıştırmak (HyperFormula) | Yüksek | 0 | Düşük | 6 MB dosya, 100 bin formül, kırık referanslar, UX zayıf |

**Sonuç:** Hesap mantığı TypeScript'te yazılır ve altın testlerle Excel'e kilitlenir.

### ADR-002: Hesap motoru (formülleri nasıl taşıyacağız)
**Karar:** **Bildirimsel (declarative) kural motoru + saf TypeScript fonksiyonları.**
- Etken kartları kütüphane verisinden üretilir.
- Durum kuralları JSON kural tablolarıdır.
- Sayısal hesaplar (Rn/Rt/Rk, risk, kaçınma, güneş) birim testli saf fonksiyonlardır.

Excel yardımcıları için `src/engine/excel-compat.ts` yaz:
- `eqTR` (trim + `tr-TR` büyük harf duyarsız eşitlik)
- `vlookupExact` (ilk eşleşme, duyarsız)
- `concatenate`
- `weekdayTR`
- `today`
- `textFormat`

Tanım'daki `COUNTIF/ROW/VLOOKUP` liste motoru **taşınmaz**. Yerine veri indeksleri gelir.
**Ödünleşim:** Excel formülü ile kod arasında sapma riski var. Bunu altın testler (§11) ve "Excel uyumlu mod" kapatır.

### ADR-003: Durum ve reaktif bağ sistemi
**Karar:** Tek **Dosya (Case) deposu.** Zustand + Immer + seçiciler (selectors).
- Türetilmiş değerler (kart durumu, özet, rapor) hafızalanmış (memoized) seçicilerle hesaplanır, depoya yazılmaz.
- Böylece "bir girdi değişince her şey güncellenir" garanti olur.
- **Bağımlılık grafiği** (`src/engine/graph.ts`): her türetilmiş alan `dependsOn` bildirir. Bu grafik "Bağ Haritası" ekranında görselleştirilir. Döngü ve sahipsiz girdi kontrolünde de kullanılır.

### ADR-004: Kalıcılık ve Ayarlar
**Karar:**
- Dosya verisi **IndexedDB**'de (Dexie). `.seres.json` olarak dışa/içe aktarılır.
- Ayarlar üç katmanda birleşir: **paketle gelen varsayılan JSON → merkezi Ayarlar (Netlify Blobs, yönetici parolasıyla) → yerel geçersiz kılma.**
- Her Ayarlar kaydı **sürümlü** olur (semver + değişiklik notu + hash).
- Her dosya/rapor oluştuğu andaki **ayar sürüm hash'ini dondurur.** Mahkemeye giden raporun hangi bilgi bankası sürümüyle üretildiği kanıtlanabilmeli.

Yönetici kimlik doğrulaması:
- Demo için Netlify ortam değişkeni `ADMIN_PASSCODE` + imzalı kısa ömürlü token (Function).
- Üretim için Netlify Identity'ye geçiş notu.

### ADR-005: Modül (eklenti) sistemi
**Karar:** İki katmanlı paket modeli.
1. **İçerik paketi** (yalnız JSON, kod yok): yeni etken grupları, listeler, metinler, kural profilleri. Ayarlar'dan .zip/.json yüklenerek eklenir veya çıkarılır.
2. **Hesap modülü** (kod + manifest): güneş, ayna, kaçınma gibi hesap içeren modüller. `src/modules/<id>/` altında, derleme zamanında kayıt defterine (registry) girer, Ayarlar'dan açılıp kapanır.

Her ikisi de aynı **manifest sözleşmesini** kullanır (§6). Modüller birbirine doğrudan bağlanmaz. Yalnızca Dosya deposundaki **isimlendirilmiş alanlar** üzerinden okur/yazar. Bu, Excel'deki "dosyalar arası veri aktarımı"nın kontrollü karşılığıdır.

### ADR-006: Rapor çıktısı
**Karar:**
- Ekranda A4 **Belge Modu** (CSS `@page`, Excel başlık/altbilgi düzeninin birebir kopyası).
- **PDF:** tarayıcı yazdırma + isteğe bağlı `@react-pdf/renderer`.
- **DOCX:** `docx` kütüphanesi.
- **Excel'e geri aktarma:** ExcelJS ile Grş 1 düzeninde. Faz 4, isteğe bağlı.

**Teknoloji listesi:**
- React Router (Netlify `_redirects` ile SPA)
- Tailwind CSS + Radix UI / shadcn bileşenleri
- Framer Motion (ölçülü geçişler)
- TanStack Table (referans veri tabloları)
- Recharts (istatistik)
- React Flow (Bağ Haritası)
- Leaflet + OSM (güneş modülünde konum/yön seçimi)
- zod (şema doğrulama)
- SheetJS (xlsx içe aktarma)
- Vitest (birim + altın testler)
- Playwright (uçtan uca smoke)

---

## 5. VERİ MODELİ (TypeScript)

```ts
// content/core/factors/*.json  ← Tanım + BİLGİ HESAP'tan betikle üretilir
interface FactorDef {
  id: string;                 // değişmez: "yol.hava-durumu"
  group: 'dosya'|'yer-zaman'|'yol-cevre'|'arac'|'dorse'|'surucu'|'yolcu'|'yaya'|'iz'|'olu-yarali'|'kaza-nedeni'|string;
  displayCode: string;        // "2.3." (numaralandırma şemasından da üretilebilir)
  title: string;              // "2.3. HAVA DURUMU"
  subTitle?: string;          // "Hava Durumu: "
  aranan?: string;            // "Aranan: …"
  sourceRef: { sheet: string; row: number; colMap: Record<string,string> }; // izlenebilirlik
  valueSource:                // kartın "Değer" satırı nereden gelir
    | { kind: 'input'; path: string }        // örn. "kazaYeri.havaDurumu" (Grş 1!D43)
    | { kind: 'cardSelect'; optionsRef: string }
    | { kind: 'derived'; fn: string };
  options?: FactorOption[];   // seçeneğe özel nedensellik/açıklama tablosu
  textLevel: 'option'|'factor';
  texts: {
    nedensellik?: string; aciklama?: string; sonuc?: string; sorumlular?: string; tespitYontemi?: string;
    onlemMetni: string;            // G: "…önleminin alınması"
    uygunlukMetni: string;         // H: "…önlemi alınmıştır."
    nedensellikYokMetni: string;   // I
    sorunMetni: string;            // J
    ekDosyaMetni: string;          // F/K: "Ek dosya hazırla"
  };
  statusProfile: 'yol-cevre'|'arac'|'kisi'|string;
  ekDosyaRule: 'hideOnAranmadi'|'hideOnAranmadiOrVar';
  extraBlocks?: { label: string; source: string }[]; // örn. BİLGİ HESAP!B32:D40 ek açıklama
  showInReport: boolean;      // Excel'de görünenler true; kullanılmayan 92 başlık false (taslak)
  perEntity?: 'arac'|'surucu'|'yolcu'|'yaya';        // varlık başına tekrar eden kart
}
interface FactorOption { label: string; nedensellik?: string; aciklama?: string; sonuc?: string; extra?: Record<string,string> }

// Kullanıcının kart üzerinde girdiği değerler (Dosya deposu)
interface FactorEntry {
  factorId: string; entityIndex?: number;
  selectedValue?: string;           // kartta seçiliyorsa
  incelemeDurumu?: 'Yeterli'|'Yetersiz'|'Var'|'Yok'|'Yapıldı'|'Aranmadı'|'Belirsiz'|'Davranış';
  muteala?: string;
  tespit: { yontemler: string[] /*≤3*/; delilKodu?: string; puanlar: [number?,number?,number?,number?]; dogrulama?: 'Doğrulandı'|'Belirsiz' };
  sorumlu?: string; hakimSavciTespit?: string;
  ekler?: AttachmentRef[];          // "Ek dosya hazırla" bayrağının karşılığı: kanıt/görsel yükleme
  moduleSuggestions?: ModuleSuggestion[]; // örn. güneş modülünden gelen öneri (onay bekler)
}

// Türetilmiş kart çıktısı (depoya yazılmaz, seçiciyle hesaplanır)
interface FactorResult {
  ekDosyaBayragi: string; degerDurumMetni: string; kazadaDurumu: string;
  durum: 'ETKEN'|'ETKEN DEĞİL'|'İNCELENMELİ'|'ÖZEL İSTEMLİ'|'İNCELEMELİ'|''|'⚠ Kural tanımsız';
  aciklama: string; nedensellik: string; sorunAciklama: string;
  provenance: ProvenanceStep[];     // "Neden bu sonuç?" paneli: hangi girdi, hangi kural, hangi kütüphane sürümü
}

interface Case {
  id: string; createdAt: string; settingsVersionHash: string;
  dosya: { firma: string; raporTuru: string; personel: string; il: string; ilce: string; mahalle: string;
           mahkemeNo?: number; mahkemeAdi: string; dosyaTuru: 'ceza'|'hukuk'|'savcilik'|'icra'; dosyaNo: string; suc: string };
  taraflar: Record<string,string>;          // etiketler dosyaTuru'na göre (Tanım!A64:D79)
  gorevlendirme: { incelemeTuru?: string; dayanak?: string; konu?: string; sorular?: string; tarih?: string; sure?: string; kesifTarihi?: string; raporTarihi?: string };
  bilirkisi: { ad: string; uzmanlik: string; sicilNo: string };
  kazaYeri: { tarih: string; saat: string; mahalle: string; adres: string; yerlesim?: string; azamiHiz?: number; azamiHizOnerisi?: number;
              gunDurumu?: string; havaDurumu?: string; yolSinifi?: string; akisYonu?: string; /* … Grş 1 satır 42–96 */ };
  istatistik: { yolKesimNo?: string; yon?: number; hareket?: number; yayaKatsayi?: number; aracKatsayi?: number; siklikArac?: string; siklikYaya?: string;
                saatler: { olay?: string; incelemeBaslama?: string; ambulans?: string; ihbar?: string }; metinSecimleri: Record<string,string[]> };
  araclar: Vehicle[]; suruculer: Driver[]; yayalar: Pedestrian[]; yolcular: Passenger[];
  factorEntries: FactorEntry[];
  modules: Record<string /*moduleId*/, unknown>;   // modül girdileri/çıktıları (namespaced)
}
```

**`content/` yapısı:**
- `core/factors/{yer-zaman,yol-cevre,arac,dorse,surucu,yolcu,yaya,izler,olu-yarali,kaza-nedeni}.json`
- `core/lists/*.json`: tüm açılır listeler, kaynak hücre referansıyla
- `core/rules/status-profiles.json`
- `core/evidence-codes.json`: `Tanım!C2000:E2080` + `Sayfa5` eşleme tablosu
- `core/legal-texts.json`: Yargıtay açıklamaları
- `core/report-meta.json`: Dok.No, revizyon vb.
- `core/numbering.json`
- `core/knowledge/{egitimler,yetki-belgeleri,kayiplar,…}.json`

**`data/reference/` yapısı:**
- `il-ilce-mahalle.json`
- `il-istatistik-2023.json`
- `ilce-nufus-2023.json`
- `kgm-trafik-sayim.json`
- `tasit-sayilari-2024.json`

---

## 6. MODÜL SÖZLEŞMESİ VE ÖRNEK: GÜNEŞ ETKENLİĞİ

### 6.1 Manifest şeması

```ts
interface ModuleManifest {
  id: string; name: string; version: string; kind: 'content'|'compute';
  description: string; icon?: string; author?: string;
  dependsOn?: { id: string; version: string }[];
  inputs:  { key: string; from: string /* Case yolu, örn. "kazaYeri.tarih" */; required: boolean; fallback?: 'manual'|'setting' }[];
  outputs: { key: string; label: string; unit?: string }[];   // modules[id].<key> altına yazılır
  pages:   { route: string; title: string; sheetName?: string /* Excel karşılığı */ }[];
  factors?: string[];                     // eklediği etken kartı ID'leri (içerik)
  hooks?:  { targetFactorId: string; suggest: string /* fonksiyon adı */ }[];  // kartlara öneri üretir
  settingsSchema?: object;                // zod/JSON-schema: yöneticinin düzenleyeceği katsayılar
  reportSections?: { id: string; title: string; after: string /* hangi bölümden sonra */ }[];
  goldenTests?: string;                   // test dosyası yolu
}
```

Kayıt defteri (`src/modules/registry.ts`) etkin modülleri Ayarlar'dan okur. Navigasyon, kart önerileri, rapor bölümleri ve Bağ Haritası buna göre otomatik genişler. Bir modül kapatılınca:
- onun yazdığı alanlar "pasif" görünür,
- kartlardaki öneriler kalkar,
- veri silinmez.

### 6.2 Güneş Etkenliği modülü: Excel'in anatomisi

| Sayfa | İçerik |
|---|---|
| `model` | Açıklama, kullanım, kaynak (NOAA Solar Calculator, PVGIS) |
| `Vaka_Girişi` | Mavi hücreler: Vaka ID, Tarih-Saat (yerel), UTC ofset (+3), Enlem, Boylam, **Yol doğrultusu/heading** (0=K, 90=D, 180=G, 270=B), **pitch** (genelde 0), Hız (km/s), Reaksiyon süresi t (s) |
| `Hesap` | NOAA yaklaşımı: gün içi saat, yıl içi gün N, γ, EoT, deklinasyon δ, zaman ofseti, TST, saat açısı HA, zenit, elevasyon, azimut, güneş vektörü (E,N,U), görüş vektörü, iç çarpım, **3B açı farkı θ** |
| `sınıflandırma` | θ bantları ve K katsayısı. 0–5° Tam körlük, K 0,1 · 5–10° Çok yüksek, 0,4 · 10–20° Yüksek, 0,6 · 20–45° Orta, 0,8 · >45° Düşük/önemsiz, 1,0. Reaksiyon mesafesi normal = V/3,6 × t; glare = normal / K; algı kaybı katsayısı = 1/K |
| `Rapor_cıktı` | Kopyala/yapıştır özet + **tek satırlık rapor cümlesi**: "Kaza anında güneş elevasyon X°, azimut Y° olup … θ=Z° … sınıfında değerlendirilmiştir (K=…)" |
| `Kurumsal_Model` | Kurumsal döngü: veri üretimi → analiz çekirdeği → müdahale → izleme. "Glare risk pencereleri" |

Başlık bloğu çekirdekten dış bağlantıyla gelir (`[EĞİTİM 001.xlsx]Tanım!C9` …). **Webde bu, çekirdek `report-meta` paylaşımıdır.**

Bağlantı noktası: çekirdek sayfa 3'te **"2.1 GÜN DURUMU" (V9)** kartı `model!A1`'e, **"1.4 SAAT/DAKİKA – Güneşin etkenliği" (V19)** kartı `Vaka_Girişi!A1`'e köprü veriyor. Modül bu iki karta bağlanacak.

### 6.3 Güneş Excel'indeki KRİTİK hatalar (port ederken düzelt)

Excel'in Hesap sayfası şu an **yanlış sonuç** üretiyor. Örnek vakada "Tam körlük" diyor, doğrusu "Düşük/önemsiz". Bu modülde "Excel uyumlu mod" **olmayacak.** Doğru algoritmayı uygula ve hataları `docs/tutarsizlik-raporu.md` dosyasına yaz.

1. **Yerel ayar hatası:** Girdiler metin olarak tutulmuş. `VALUE("41.0082")` Türkçe Excel'de **410082** oluyor (nokta binlik ayırıcı sayılıyor). `VALUE("1.5")` tarih olarak **46143** oluyor. Webde sayı alanları gerçek sayı olsun, hem `,` hem `.` ondalık kabul edilsin.
2. **Satır kayması:** Formüllerin çoğu bir satır yanlış hücreyi okuyor.
   - TST'de I24 (ofset) yerine I23 (deklinasyon) kullanılmış.
   - HA'da I25 yerine I24.
   - Zenitte HA yerine TST.
   - Elevasyonda zenit yerine HA.
   - Güneş vektöründe elevasyon/azimut yerine zenit(rad)/elevasyon.
   - İç çarpımda yanlış üçlü (`I29*I32+I30*I33+I31*I34`, doğrusu `I30*I33+I31*I34+I32*I35`).
   - θ'da iç çarpım yerine `I35`.
   - Çıktı etiketleri de kaymış (W19 "elevasyon" = zenit radyan, W21 "θ" = iç çarpım).
3. **Tek araç varsayımı:** Excel tek heading ile hesaplıyor. Webde **her sürücü/araç için ayrı** heading, hız ve reaksiyon süresi ile hesapla. Güneş konumu ortak, θ araç başına.

**Doğru algoritma (NOAA yaklaşımı):**
- N = yılın günü, h = yerel ondalık saat
- γ = 2π/365 × (N − 1 + (h − 12)/24)
- EoT (dk) = 229,18 × (0,000075 + 0,001868 cosγ − 0,032077 sinγ − 0,014615 cos2γ − 0,040849 sin2γ)
- δ = 0,006918 − 0,399912 cosγ + 0,070257 sinγ − 0,006758 cos2γ + 0,000907 sin2γ − 0,002697 cos3γ + 0,00148 sin3γ
- ofset = EoT + 4 × boylam − 60 × tz
- TST = (h × 60 + ofset) mod 1440
- HA = TST/4 − 180 (derece)
- cos z = sinφ sinδ + cosφ cosδ cosHA
- elevasyon = 90 − z
- azimut = (atan2(sinHA, cosHA sinφ − tanδ cosφ) [derece] + 180) mod 360
- s = (cos el · sin az, cos el · cos az, sin el)
- v = (cos p · sin heading, cos p · cos heading, sin p)
- θ = acos(clamp(s·v, −1, 1))

**Güneş modülü altın değerleri** (bağımsız olarak hesaplandı; NOAA Solar Calculator ile ±0,5° içinde doğrula):

| Vaka | Girdi | Beklenen |
|---|---|---|
| G-1 (Excel örneği) | 2026-02-16 12:00, UTC+3, 41,0082 / 28,9784, heading 90°, pitch 0, 50 km/s, t=1,5 s | N=47, EoT ≈ −14,23 dk, δ ≈ −12,61°, TST ≈ 641,7 dk, HA ≈ −19,58°, **elevasyon ≈ 33,41°**, **azimut ≈ 156,94°**, **θ ≈ 70,91°** → **Düşük/önemsiz, K=1**, reaksiyon mesafesi 20,83 m (glare 20,83 m) |
| G-2 (çekirdek örneğine bağlı) | 2025-09-01 17:45, UTC+3, İnegöl ≈ 40,0806 / 29,5097, heading 270° (batıya), 50 km/s, t=1,5 s | **elevasyon ≈ 20,20°**, **azimut ≈ 264,02°**, **θ ≈ 21,03°** → **Orta, K=0,8**, reaksiyon 20,83 m → glare **26,04 m** |

### 6.4 Güneş modülü manifest örneği

```json
{
  "id": "gunes-etkenligi", "name": "Güneş Etkenliği (Solar Glare)", "version": "1.0.0", "kind": "compute",
  "inputs": [
    { "key": "tarih", "from": "kazaYeri.tarih", "required": true },
    { "key": "saat", "from": "kazaYeri.saat", "required": true },
    { "key": "utcOfset", "from": "settings.gunes.varsayilanUtcOfset", "required": true, "fallback": "setting" },
    { "key": "konum", "from": "kazaYeri.konum", "required": true, "fallback": "manual" },
    { "key": "heading[]", "from": "araclar[].seyirYonu", "required": true, "fallback": "manual" },
    { "key": "pitch[]", "from": "suruculer[].bakisEgimi", "required": false, "fallback": "setting" },
    { "key": "hiz[]", "from": "araclar[].hiz", "required": false },
    { "key": "reaksiyon[]", "from": "suruculer[].reaksiyonSuresi", "required": false, "fallback": "setting" }
  ],
  "outputs": [
    { "key": "elevasyon", "label": "Güneş elevasyon", "unit": "°" },
    { "key": "azimut", "label": "Güneş azimut", "unit": "°" },
    { "key": "arac[].theta", "label": "3B açı farkı θ", "unit": "°" },
    { "key": "arac[].etkiSinifi", "label": "Etki sınıfı" },
    { "key": "arac[].K", "label": "Glare katsayısı K" },
    { "key": "arac[].reaksiyonMesafesiNormal", "label": "Reaksiyon mesafesi (normal)", "unit": "m" },
    { "key": "arac[].reaksiyonMesafesiGlare", "label": "Reaksiyon mesafesi (glare)", "unit": "m" },
    { "key": "raporCumlesi", "label": "Rapor cümlesi" }
  ],
  "pages": [
    { "route": "/modul/gunes", "title": "Model", "sheetName": "model" },
    { "route": "/modul/gunes/vaka", "title": "Vaka Girişi", "sheetName": "Vaka_Girişi" },
    { "route": "/modul/gunes/hesap", "title": "Hesap", "sheetName": "Hesap" },
    { "route": "/modul/gunes/siniflandirma", "title": "Sınıflandırma", "sheetName": "sınıflandırma" },
    { "route": "/modul/gunes/rapor", "title": "Rapor Çıktısı", "sheetName": "Rapor_cıktı" },
    { "route": "/modul/gunes/kurumsal", "title": "Kurumsal Model", "sheetName": "Kurumsal_Model" }
  ],
  "hooks": [
    { "targetFactorId": "yer-zaman.saat-dakika", "suggest": "suggestFromGlare" },
    { "targetFactorId": "yol.gun-durumu", "suggest": "suggestFromGlare" }
  ],
  "settingsSchema": "thetaBands[{max,sinif,K}], varsayilanReaksiyon=1.5, varsayilanPitch=0, varsayilanUtcOfset=3, oneriEslemesi{sinif→incelemeDurumu}",
  "reportSections": [{ "id": "gunes", "title": "Güneş Etkenliği Değerlendirmesi", "after": "yol-cevre" }]
}
```

**Kart önerisi (hook) davranışı:**
- Modül, hedef kartta "Güneş modülü önerisi" şeridi gösterir. Şeritte θ, sınıf, K ve rapor cümlesi yer alır.
- Önerilen İnceleme Durumu Ayarlar'daki eşlemeden gelir. Varsayılan: Tam körlük/Çok yüksek → Yetersiz, Yüksek → Belirsiz, Orta/Düşük → Yeterli. **Bu eşleme ürün sahibinin onayına tabidir.** `acik-sorular.md` dosyasına yaz.
- Bilirkişi "Uygula" demeden karta hiçbir şey yazılmaz. Uygulanınca rapor cümlesi Müteala'ya eklenir ve kanıt zincirinde "Kaynak: Güneş modülü v1.0.0" görünür.

**Konum ve yön:** Çekirdek Excel'de koordinat ve yol yönü alanı yok. Bunları **yeni alan** olarak ekle:
- `kazaYeri.konum`: Leaflet harita seçici + elle enlem/boylam,
- `araclar[].seyirYonu`: haritada ok çizerek veya derece girerek.

İl/ilçe merkez koordinatları için `data/reference/ilce-koordinat.json` yuvası aç. Veri yoksa elle girişe düş.

### 6.5 Sonraki modül adayları (iskeletini hazırla, içeriği sonra)

- `kacinma-mutalaa` (sayfa 19, §2.9)
- `istatistik-risk` (sayfa 2., ayrı modül olarak da sunulabilir)
- `ayna` (AYNA)
- `zaman-mesafe` (ZMN5)
- `sorumluluk` (SRNK)
- `kavsak` (KVŞ)
- `iz-analizi` (6., 7., 10. bölümler)

Her biri için boş manifest + "Excel bekleniyor" rozeti olsun. Yeni bir Excel verildiğinde **bu prompttaki Faz 0 analiz yöntemini aynen uygula** ve aynı sözleşmeyle modüle çevir.

---

## 7. AYARLAR (YÖNETİCİ PANELİ)

Ayrı rota: `/ayarlar`, parola korumalı. Kullanıcı (bilirkişi) bu alana erişmez. Bilirkişi yalnızca kendi doldurması gerekenleri görür:
- Giriş,
- Grş 1 alanları,
- kartlardaki İnceleme Durumu, Müteala, Tespit, Sorumlu, Hâkim/Savcı Tespit alanları,
- modül girdileri.

Bölümler:
1. **Bilgi Bankası (Etken Kütüphanesi):** Etken ağacı (gruplar > etkenler > seçenekler). Her metin alanı düzenlenebilir: aranan, nedensellik, açıklama, sonuç, sorumlular, önlem/uygunluk/sorun/ek dosya metinleri. "Raporda göster" anahtarı, sıralama ve kopyalama olsun. Yeni etken ekleme. Arama.
2. **Listeler:** Tüm açılır listeler, hangi alanlarda kullanıldıkları ve Excel kaynak hücresiyle birlikte.
3. **Kural Profilleri:** Durum karar tabloları (§2.5), görsel matris editörü. "Excel uyumlu" ve "birleştirilmiş" ön ayarları.
4. **Katsayılar ve Sabitler:** Rn/Rt/Rk sabitleri, sıklık tablosu, risk katsayısı 0,0035, kaçınma puanlaması, kurum çarpanları, güneş θ bantları.
5. **Referans Veriler:** KGM, TÜİK, il/ilçe/mahalle, nüfus. Tablo görünümü. CSV/XLSX ile yükle ve değiştir. Yıl etiketi ve kaynak notu.
6. **Delil Kodları:** `Tanım!C2000:E2080` + `Sayfa5` eşleme (eski kod → Türkçe kod).
7. **Hukuki Metinler:** Yargıtay açıklamaları, rapor türüne göre varyantlar.
8. **Rapor Meta ve Kimlik:** Firma, bilirkişi profilleri, logolar, Dok.No, Revizyon No/Tarihi, ISO, Birim, Yenileyen/Onaylayan, altbilgi notu.
9. **Numaralandırma Şeması:** Tanım (v1) mi, BİLGİ HESAP (v2) mi, özel mi.
10. **Modüller:** Kurulu modüller listesi. Aç/kapat. Paket yükle (.json/.zip). Sürüm. Bağımlılık uyarıları.
11. **Sürüm Geçmişi:** Her kayıtta değişiklik notu. Sürümler arası fark (diff). Geri al. Tüm ayarları tek paket olarak dışa/içe aktar.
12. **Tutarsızlık Raporu:** §3'teki maddeler canlı olarak.

---

## 8. SAYFA YAPISI, KULLANICI DENEYİMİ VE GÖRSEL TASARIM

### 8.1 Excel sayfası → web rotası (bire bir)

Sol navigasyon Excel sekme sırasını izler. Her öğede küçük gri alt yazıyla Excel sayfa adı yazsın ("Sayfa: 3"). Rapor sayfalarının başlığında bir sonraki sayfaya geçiş, Excel'deki F2 köprüsünün karşılığıdır.

| Excel | Web rotası | Açıklama |
|---|---|---|
| Giriş | `/dosya/giris` | Kapak (TÜBİR + SB logoları), dosya kimliği, bağımlı il → ilçe → mahalle |
| Grş 1 | `/dosya/veri` | Sekmeler: Taraflar ve Görevlendirme · Yer ve Zaman · Yol ve Çevre · Araçlar · Sürücüler · Yayalar · Yolcular. Her alanın etiketi kütüphaneden. Taraf etiketleri dosya türüne göre değişir. |
| 1. | `/rapor/aciklamalar` | Hukuki dayanak metni |
| 2. | `/analiz/yer-istatistik` | Yer/zaman özeti, nüfus/taşıt/km kaza oranı göstergeleri (Recharts), KGM kesim bilgisi, risk/sıklık hesabı, seçilebilir metin blokları |
| 3 | `/analiz/yol-cevre` | 30 etken kartı |
| sonuç1 | `/sonuc` | ETKEN / İNCELENMELİ özeti, tüm gruplar, filtre |
| 4 | `/analiz/arac/:n` | Araç kartları (yan yana karşılaştırma görünümü seçeneği; Excel'deki Araç 1 / Araç 2 düzeni) |
| 5 | `/analiz/surucu/:n` | Sürücü kartları |
| 6 | `/analiz/yolcu/:n` | Yolcu kartları |
| 9Y | `/analiz/yaya/:n` | Yaya kartları |
| 19 | `/modul/kacinma` | Kazadan kaçınma ve kusur (modül) |
| (eklenti) | `/modul/gunes/*` | Güneş etkenliği (6 alt sayfa) |
| Tanım, BİLGİ HESAP, Sayfa3/4/5 | `/ayarlar/*` | Yönetici |
| — | `/bag-haritasi` | Veri akışı grafiği |
| — | `/rapor/onizleme` | A4 belge modu, PDF/DOCX |

### 8.2 Etken Kartı arayüzü

Kartın üst şeridinde:
- kod + başlık,
- durum çipi (Excel renkleri, radyal gradyan),
- "Ek dosya gerekli" rozeti (bayrak doluysa; tıklayınca kanıt yükleme alanı).

Gövde:
- **Değer** (girdiden geliyorsa kilitli ve "Grş 1'den" etiketli; tıklayınca o alana gider)
- **İnceleme Durumu** (segment buton)
- otomatik **Kazada Durumu** cümlesi
- **Açıklama** ve **Nedensellik** (katlanır, kütüphaneden; kaynak etiketiyle)
- **Müteala** (zengin metin, kullanıcı)
- **Sorun açıklama** (otomatik)
- **Tespit** satırı: 3 yöntem çipi, delil kodu seçici (kod + ad), 4 puan, doğrulama
- **Sorumlu** + **Hâkim/Savcı Tespit**

Sağ üstte **"Neden?"** düğmesi. Bu, provenance panelini açar:
"Girdi: Hava = Açık ve Güneşli (Grş 1 › 2.3) → İnceleme Durumu = Belirsiz → Kural: yol-cevre profili, 'Belirsiz' ⇒ İNCELENMELİ (Excel 3!V31) → Metinler: Kütüphane v1.0.0 › yol.hava-durumu".

**Demonun ispat anı bu panel.**

### 8.3 Görsel kimlik

Logolardan türetilmiş, "adli-kurumsal premium" bir dil kullan. Hazır şablon görünümünden kaçın.

- **Renkler:**
  - lacivert `#0E2A47` (birincil),
  - camgöbeği `#1FA9D6` (vurgu, logodaki S),
  - bronz/koyu kahve `#4A3426` (logodaki B),
  - altın `#C9A24A` (TÜBİR, ince çizgi ve rozetler),
  - krem zemin `#F4EEE4`,
  - kağıt beyazı `#FFFDF8`.

  Durum renkleri §2.5'teki Excel renkleridir. Kontrast WCAG AA olmalı.
- **Yazı tipleri** (Türkçe glif desteği şart):
  - başlıklarda serif ("Cormorant Garamond" veya "Libre Caslon"),
  - arayüzde "Inter" veya "IBM Plex Sans",
  - **A4 rapor gövdesinde Times New Roman benzeri** ("Tinos" veya "Libre Baskerville"), Excel çıktısına sadık.
- **İki mod:**
  1. **Çalışma modu:** ferah kart düzeni, sol navigasyon, üstte dosya kimliği şeridi (dosya no, mahkeme, il/ilçe, tarih), sağda canlı "Sonuç sayacı" (ETKEN n · İNCELENMELİ n).
  2. **Belge modu:** A4 sayfalar, Excel'deki ISO başlık bloğu ve altbilginin birebir düzeni, logo konumları Excel'deki gibi (Giriş'te büyük kapak, rapor sayfalarında sol üst).
- **Ölçülü hareket:** kart durum değişince çipte yumuşak renk geçişi, sonuç sayacında sayı animasyonu, Bağ Haritası'nda değişen düğümün nabız efekti.
- **Duyarlı tasarım:** masaüstü öncelikli, tablette tam çalışır, mobilde okuma ve önizleme.
- **Demo modu:** "Örnek dosyayı yükle" düğmesi. Excel'deki örnek veri (Bursa/İnegöl/CEBECİ, 01.09.2025 17:45, Şafak Vakti, Açık ve Güneşli, 2 Sokak, Tek Yönlü Yol, 1. Araç 06……, 1989 model, 1600 cc, Otomobil …) tek tıkla yüklensin. Sunum sırasında boş ekranla uğraşılmasın.

---

## 9. RAPOR ÇIKTISI

- Rapor bölüm sırası Excel sayfa sırasıdır: Kapak (Giriş) → Taraflar/Görevlendirme (Grş 1 üst bölüm) → 1. Açıklamalar → 2. Yer/Zaman/İstatistik → 3 Yol-Çevre → 4 Araç(lar) → 5 Sürücü(ler) → 6 Yolcu(lar) → 9Y Yaya(lar) → modül bölümleri → Sonuç → İmza/altbilgi.
- Her sayfada ISO başlık bloğu, sayfa no x/y, altbilgi notu.
- "Raporda göster" kapalı kartlar ve "Aranmadı" durumundaki kartlar için Ayarlar'da "gizle / kısa göster / tam göster" seçeneği olsun.
- Çıktılar: PDF (yazdır), DOCX, `.seres.json`. Raporun son sayfasında **ayar sürüm hash'i** ve üretim zamanı yazsın.

---

## 10. EXCEL'LER ARASI VERİ AKTARIMI VE KONTROL SİSTEMİ

Excel'de dosyalar arası bağ dış bağlantı (`[1]Tanım!…`) ve köprülerle kurulmuş, kırılgan. Webde bu bir **sözleşmeli veri yolu**:

- Her modül manifestinde `inputs[].from` ve `outputs[]` bildirilir. Kayıt defteri yükleme anında şunları doğrular:
  - **Sahipsiz girdi:** okunan alanı kimse üretmiyor ve elle girişe de izin yok → hata,
  - **Döngü:** A modülü B'yi, B modülü A'yı besliyor → hata,
  - **Sürüm uyumsuzluğu** → uyarı.
- **Kontrol paneli** (`/bag-haritasi` + "Kontroller" sekmesi):
  - Eksik zorunlu girdiler,
  - tanımsız kural sonuçları,
  - `#REF`-benzeri kopuk referanslar (kütüphanede silinmiş bir etkene bağlı giriş),
  - modül önerisi bekleyen kartlar,
  - **tutarlılık kuralları.** Örnekler: "Gün durumu Gece ama saat 12:00"; "Hava Açık ve Güneşli, güneş modülü θ<10° ama 1.4 kartı 'Aranmadı'"; "Araç sayısı 2 ama 10.2 'Tek araçlı kaza'"; "Alkol 'Sıfır' ama psiko-fiziksel şüphe 'Var'". Tutarlılık kuralları Ayarlar'dan eklenebilsin (basit ifade dili veya JSON koşulları).
- **Excel köprüsü (geçiş yolu):** "Excel'den içe aktar" mevcut bir `EĞİTİM 001.xlsx` benzeri dosyanın Grş 1, Giriş ve kart girişlerini (E sütunu inceleme durumları, müteala, tespit) okuyup bir Dosya'ya çevirsin. Böylece eski dosyalar da sisteme taşınabilir. Hücre eşleme tablosu `content/core/excel-map.json` içinde olsun.

---

## 11. TEST VE KABUL KRİTERLERİ

### 11.1 Altın testler (zorunlu, CI'da çalışır)

`tests/golden/core-sample.test.ts` dosyası Excel'deki örnek veriyi Case'e yüklesin ve şunları doğrulasın. Değerler, dosyanın kayıtlı (cached) hesap sonuçlarıdır:

| Alan | Beklenen |
|---|---|
| Haftanın günü (01.09.2025) | `PAZARTESİ` |
| Rapor başlığı | `3 AĞIR CEZA MAHKEMESİ BİLİRKİŞİ RAPORUDUR` |
| İl toplam nüfus (Bursa) | `3214571` |
| İlçe nüfus (İnegöl) | `299203` |
| İl toplam araç | `1143096` |
| İl toplam kaza | `63581` |
| KGM kesim `750-09.0`: yolu kullanan araç / km / yol kazası / kamyon hızı / %85 | `10221` / `29` / `1` / `80` / `88` |
| İlçe kazası (5 yıllık) | `2` |
| Rn | `1.977900005941695` |
| Rt | `5.562175005423867` |
| Rk | `0.28372957636239116` |
| AC13 / AC14 / AD14 / AC15 / AD15 | `0.0035` / `0.0385` / `0.1010625` / `0.021` / `0.02625` |
| Sayfa 3 durumları | 1.4 SAAT → İNCELENMELİ; 2.1 GÜN DURUMU (İnceleme "Yok") → ETKEN; 2.3 HAVA → İNCELENMELİ; 2.4 YOL SINIFI ("Yetersiz") → İNCELENMELİ; 2.5 AKIŞ YÖNÜ ("Aranmadı") → ETKEN DEĞİL; 2.6 KAPLAMA ("Belirsiz") → İNCELENMELİ … (tüm 30 kartı çıkarımdan üret) |
| 2.1 Kazada Durumu cümlesi | `Şafak VaktiYönetmeliğe uygun güvenlik önleminin alınması` (Excel uyumlu modda boşluksuz birleştirme; "okunur mod"da araya boşluk) |
| 2.1 Açıklama (Şafak Vakti) | `Gün doğumunda: Göz kamaşması, sis ve düşük görüş.` |
| sonuç1 sayısı | `10` |
| Sayfa 4 araç durumları | 4.2 Araç Cinsi ("Aranmadı") → ETKEN DEĞİL … |
| Sayfa 5 | 5.1 ("Aranmadı") → ETKEN DEĞİL, Kazada durumu `Reşit ` |
| Sayfa 19 hız | `40.298507462686565` km/s, `11.194029850746269` m/s; senaryo 3 → KAZADAN KAÇINABİLİRDİ; toplam `791` |

**Kural:** Testlerin beklenen değerlerini elle yazma. Faz 0 çıkarım betiği Excel'in kayıtlı değerlerinden `tests/golden/expected.json` üretsin. Yukarıdaki tablo, çıkarımın doğruluğunu kontrol etmek içindir.

Test etmen gereken diğer noktalar:
- Türkçe büyük/küçük harf eşleşmesi (`i/İ/ı/I`): "Yetersiz" = "YETERSİZ", "Aranmadı" = "ARANMADI".
- Bağımlı liste: Bursa → İnegöl → CEBECİ var. İl değişince ilçe ve mahalle sıfırlanır.
- Dosya türü değişince taraf etiketleri değişir (4 set).
- Araç 2 doğru veriyi gösterir (Excel'deki kırık referans tekrarlanmaz).
- Güneş modülü G-1 ve G-2 değerleri (§6.3).

### 11.2 Kabul kriterleri

- [ ] Faz 0 envanteri §1.1 ile uyumlu. Farklar raporlandı.
- [ ] Kütüphanedeki 252 başlığın tamamı JSON'da, metinleri eksiksiz. Rastgele 20 etken için Excel ile metin karşılaştırma testi geçiyor.
- [ ] Bütün açılır listeler (x14 dahil) doğru kaynaktan geliyor.
- [ ] Altın testler yeşil.
- [ ] Bir girdi değişince ilgili kart, sonuç sayacı, özet ve rapor önizlemesi < 100 ms içinde güncelleniyor.
- [ ] Ayarlar'da bir nedensellik metni değişince yeni dosyalarda görünüyor. Eski dosya kendi dondurulmuş sürümünü gösteriyor ve "yeni sürüme yükselt" seçeneği sunuyor.
- [ ] Güneş modülü kapatılınca navigasyondan, kart önerilerinden ve rapordan kalkıyor. Açılınca geri geliyor. Veri kaybı yok.
- [ ] Yeni bir JSON içerik paketi (örn. "7. Lastik ve fren izleri") Ayarlar'dan yüklenince kod değişmeden yeni kart grubu çıkıyor.
- [ ] A4 belge modu PDF çıktısı Excel'in başlık/altbilgi düzenine benziyor (ekran görüntüsü karşılaştırması `docs/screens/`).
- [ ] Lighthouse: Performans ≥ 85, Erişilebilirlik ≥ 90.
- [ ] Netlify'da canlı URL çalışıyor. Yenilemede 404 yok.

---

## 12. NETLIFY DAĞITIMI

- `netlify.toml`: `build.command = "npm run build"`, `publish = "dist"`, `functions = "netlify/functions"`, SPA yönlendirmesi `/* /index.html 200`. Statik varlıklarda uzun önbellek, `data/reference/*.json` için sürümlü dosya adı.
- Functions:
  - `settings-get`
  - `settings-put` (yönetici token'ı)
  - `auth-admin` (`ADMIN_PASSCODE` → imzalı JWT, 2 saat)
  - `module-pack-upload`
- Depolama: **Netlify Blobs** (`@netlify/blobs`). Store adları `settings`, `packs`.
- Büyük referans verisi (33,5 bin mahalle, 4 bin KGM satırı) parçalı JSON olsun ve gerektiğinde yüklensin (lazy load).
- `README.md`: yerel geliştirme (`netlify dev`), ortam değişkenleri, dağıtım adımları, yeni modül ekleme rehberi.

---

## 13. ÇALIŞMA PLANI (FAZLAR) VE TESLİM

Her fazın sonunda kısa bir durum notu ve ekran görüntüleri ver. Bir faz bitmeden sonrakine geçme.

| Faz | İçerik | Çıktı |
|---|---|---|
| **0** | Excel analizi, çıkarım betikleri, `excel-analysis.md`, `tutarsizlik-raporu.md`, `acik-sorular.md`, ADR'ler | Analiz raporu + JSON içerik/referans paketleri + `expected.json` |
| **1** | Proje iskeleti, tasarım sistemi (renk/yazı/bileşen), Dosya deposu, excel-compat, kural motoru, Etken Kartı bileşeni, altın testlerin ilk yeşili (sayfa 3) | Çalışan Giriş + Grş 1 + Sayfa 3 + Sonuç |
| **2** | Sayfa 2. (istatistik/risk), 4 (araç, çok varlıklı), 5, 6, 9Y, provenance paneli, Bağ Haritası | Tüm çekirdek sayfalar |
| **3** | Modül sistemi + Güneş modülü (düzeltilmiş algoritma, araç başına θ, kart önerileri) + 19 kaçınma modülü | İki modül |
| **4** | Ayarlar paneli (tüm bölümler), sürümleme, Netlify Functions/Blobs, içerik paketi yükleme | Yönetici paneli |
| **5** | A4 belge modu, PDF/DOCX, Excel içe aktarma, demo modu, son cilalama, Lighthouse, Playwright smoke, Netlify yayını | Canlı demo URL'si |

### 13.1 Yapma / yap listesi

- ❌ Metinleri elle kopyalama veya kısaltma. ✅ Betikle eksiksiz taşı.
- ❌ Excel hatalarını sessizce düzeltme. ✅ Uyumlu mod + ayar anahtarı + rapor.
- ❌ Kart başına ayrı bileşen yazma. ✅ Tek veri odaklı Etken Kartı şablonu.
- ❌ Modüller arası doğrudan import. ✅ Yalnızca manifest ve Dosya deposu üzerinden veri akışı.
- ❌ Türkçe karşılaştırmada `toUpperCase()`. ✅ `toLocaleUpperCase('tr-TR')`.
- ❌ Gerçek kişi verisi (TCKN vb.) içeren örnekleri demoya koyma. ✅ Örnek dosyadaki yer tutucuları kullan.
- ✅ Bilinmeyen her noktayı `acik-sorular.md`'ye yaz ve Excel davranışını koru.
- ✅ Tüm arayüz metinleri Türkçe. Tarih `GG.AA.YYYY`, saat `SS:DD`, ondalık virgül (`tr-TR`).
