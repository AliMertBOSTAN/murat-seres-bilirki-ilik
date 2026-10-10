# ADR-003: Durum ve reaktif bağ sistemi

**Durum:** Kabul edildi

## Bağlam
Excel'de bir girdi değişince ona bağlı tüm hücreler güncellenir. Web'de aynı garanti gerekir ve "Neden bu sonuç?" (provenance) gösterilmelidir.

## Karar
Tek **Dosya (Case) deposu**: Zustand + Immer. Türetilmiş değerler (kart sonucu, özet, rapor) **hafızalanmış seçicilerle** hesaplanır, depoya yazılmaz. Her türetilmiş alan `dependsOn` listesi bildirir (`src/engine/graph.ts`); bu grafik Bağ Haritası'nda görselleştirilir ve döngü/sahipsiz girdi kontrolünde kullanılır. Her kart sonucu bir `provenance` adım listesi taşır.

## Seçenekler
Redux Toolkit (daha fazla tören), MobX (örtük bağımlılık, provenance zor), hesaplanan değerleri depoya yazmak (tutarsızlık riski).

## Ödünleşim
Büyük dosyalarda seçici hesaplama maliyeti; memoizasyon ve grup bazlı seçicilerle < 100 ms hedefi.

## Sonuçlar
"Bir girdi değişince her şey güncellenir" yapısal olarak garanti; test edilebilir saf fonksiyonlar.
