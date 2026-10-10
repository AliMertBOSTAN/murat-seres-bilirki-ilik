"""Excel giriş hücreleri ↔ Dosya (Case) alan yolları eşlemesi.

Bu eşleme yapısaldır (metin içermez); Grş 1 ve Giriş sayfalarındaki giriş hücrelerinin
web uygulamasındaki Case modelinde hangi alana karşılık geldiğini söyler.
"""

# Grş 1 sütun D/E/F → varlık indeksi (0,1,2)
ENTITY_COLS = {"D": 0, "E": 1, "F": 2}

# Grş 1 satır → (alan yolu, tür). Tür: 'scalar' (yalnız D), 'arac', 'surucu', 'yaya', 'yolcu' (D/E/F)
GRS1_ROWS = {
    6: ("taraflar.slot1", "scalar"), 7: ("taraflar.slot2", "scalar"), 8: ("taraflar.slot3", "scalar"),
    9: ("taraflar.slot4", "scalar"), 10: ("taraflar.slot5", "scalar"), 11: ("taraflar.slot6", "scalar"),
    12: ("taraflar.slot7", "scalar"), 13: ("taraflar.slot8", "scalar"), 14: ("taraflar.slot9", "scalar"),
    15: ("taraflar.slot10", "scalar"), 16: ("taraflar.slot11", "scalar"), 17: ("taraflar.slot12", "scalar"),
    18: ("bilirkisi.ad", "scalar"), 19: ("bilirkisi.uzmanlik", "scalar"), 20: ("bilirkisi.sicilNo", "scalar"),
    21: ("gorevlendirme.incelemeTuru", "scalar"), 22: ("gorevlendirme.dayanak", "scalar"),
    23: ("gorevlendirme.konu", "scalar"), 24: ("gorevlendirme.sorular", "scalar"),
    27: ("kazaYeri.tarih", "scalar"), 28: ("kazaYeri.haftaninGunu", "derived"), 29: ("kazaYeri.saat", "scalar"),
    30: ("dosya.il", "scalar"), 31: ("dosya.ilce", "scalar"), 32: ("kazaYeri.mahalle", "scalar"), 33: ("kazaYeri.adres", "scalar"),
    38: ("kazaYeri.yerlesim", "scalar"), 39: ("kazaYeri.azamiHiz", "scalar"), 40: ("kazaYeri.azamiHizOnerisi", "scalar"),
    42: ("yolCevre.gunDurumu", "scalar"), 43: ("yolCevre.havaDurumu", "scalar"), 44: ("yolCevre.yolSinifi", "scalar"),
    45: ("yolCevre.akisYonu", "scalar"), 46: ("yolCevre.kaplamaTipi", "scalar"), 47: ("yolCevre.yolYuzeyi", "scalar"),
    48: ("yolCevre.yolYuzeyHatalari", "scalar"), 49: ("yolCevre.yerinKonumu", "scalar"), 50: ("yolCevre.cevreOzelligi", "scalar"),
    51: ("yolCevre.seritSayisi", "scalar"), 52: ("yolCevre.platform", "scalar"), 53: ("yolCevre.yolElemanlari", "scalar"),
    54: ("yolCevre.yatayDikeyEgim", "scalar"), 55: ("yolCevre.kazaYeriIsaretleme", "scalar"), 56: ("yolCevre.isikliSesliUyari", "scalar"),
    57: ("yolCevre.korNokta", "scalar"), 58: ("yolCevre.yoldaCalisma", "scalar"), 59: ("yolCevre.yoldaCalismaIsaretleme", "scalar"),
    60: ("yolCevre.gecitOzellikleri", "scalar"), 61: ("yolCevre.aydinlatma", "scalar"), 62: ("yolCevre.cevreDiger", "scalar"),
    63: ("yolCevre.yolunOzelligi", "scalar"), 64: ("yolCevre.yolunYapiOzelligi", "scalar"),
    71: ("guzergah.yatayDikey", "scalar"), 72: ("guzergah.yatay", "scalar"), 73: ("guzergah.dikey", "scalar"),
    75: ("yolEkipman.otoKorkuluk", "scalar"), 76: ("yolEkipman.yayaYolu", "scalar"), 77: ("yolEkipman.emniyetSeridi", "scalar"),
    78: ("yolEkipman.yolSeritCizgisi", "scalar"), 79: ("yolEkipman.trafikIsaretLevhasi", "scalar"), 80: ("yolEkipman.isikliSesliIsaret", "scalar"),
    81: ("yolEkipman.yolAydinlatmasi", "scalar"), 82: ("yolEkipman.trafikGorevlisi", "scalar"), 83: ("yolEkipman.goruseEngelCisim", "scalar"),
    85: ("yolEkipman.yoldaCalisma", "scalar"), 86: ("yolEkipman.yoldaCalismaIsaretleme", "scalar"), 87: ("yolEkipman.yolSorunu", "scalar"),
    88: ("yolEkipman.yolSorunuIsaretleme", "scalar"), 89: ("kaza.olusSekli", "scalar"), 90: ("kaza.aracSayisinaGore", "scalar"),
    91: ("kaza.ilkCarpismaYeri", "scalar"), 92: ("kaza.yayaGecidiOzellikleri", "scalar"), 93: ("kaza.gecitDurumu", "scalar"),
    94: ("kaza.ilkYardim", "scalar"), 95: ("kaza.digerOzellik", "scalar"), 96: ("kaza.fotoKameraKayitlari", "scalar"),
    100: ("araclar[].aracNo", "arac"), 101: ("araclar[].plaka", "arac"), 102: ("araclar[].modelYili", "arac"), 103: ("araclar[].tescilUlkesi", "arac"),
    104: ("araclar[].cinsi", "arac"), 105: ("araclar[].motorGucu", "arac"), 106: ("araclar[].kullanimAmaci", "arac"), 107: ("araclar[].kameraKaydi", "arac"),
    108: ("araclar[].kullanimSekli", "arac"), 109: ("araclar[].kazaOncesiHareket", "arac"), 110: ("araclar[].hiz", "arac"), 111: ("araclar[].frenUzunlugu", "arac"),
    112: ("araclar[].yukCinsi", "arac"), 113: ("araclar[].istihapAsimi", "arac"), 114: ("araclar[].ilkDarbeBolumu", "arac"), 115: ("araclar[].sigortaTuru", "arac"),
    116: ("araclar[].sigortaSirketi", "arac"), 117: ("araclar[].policeNo", "arac"), 118: ("araclar[].sigortaBitis", "arac"), 119: ("araclar[].etkenAksamlar", "arac"),
    120: ("araclar[].fenniMuayeneBitis", "arac"), 121: ("araclar[].hasarDerecesi", "arac"), 122: ("araclar[].yakitCinsi", "arac"), 123: ("araclar[].lastikDurumu", "arac"),
    124: ("araclar[].lastikDisDerinligi", "arac"), 125: ("araclar[].camDurumu", "arac"), 126: ("araclar[].dikizAynaDurumu", "arac"),
    128: ("araclar[].sahibi", "arac"), 129: ("araclar[].firmaIsletme", "arac"), 132: ("araclar[].kazaSonrasiKonum", "arac"),
    134: ("suruculer[].adi", "surucu"), 135: ("suruculer[].tckn", "surucu"), 136: ("suruculer[].dogumTarihi", "surucu"), 137: ("suruculer[].cinsiyet", "surucu"),
    138: ("suruculer[].kazaSonucu", "surucu"), 139: ("suruculer[].belgeDurumu", "surucu"), 140: ("suruculer[].belgeIli", "surucu"), 141: ("suruculer[].belgeIlcesi", "surucu"),
    142: ("suruculer[].adaylik", "surucu"), 143: ("suruculer[].ogrenim", "surucu"), 144: ("suruculer[].alkol", "surucu"), 145: ("suruculer[].psikoFizikselSuphe", "surucu"),
    146: ("suruculer[].koruyucuTertibat", "surucu"), 147: ("suruculer[].meslek", "surucu"),
    155: ("yayalar[].adSoyad", "yaya"), 156: ("yayalar[].tckn", "yaya"), 157: ("yayalar[].dogumTarihi", "yaya"), 158: ("yayalar[].cinsiyet", "yaya"),
    159: ("yayalar[].kazaSonucu", "yaya"), 160: ("yayalar[].kurallar", "yaya"), 161: ("yayalar[].kazaOncesiHareket", "yaya"), 162: ("yayalar[].giysi", "yaya"),
    163: ("yayalar[].alkol", "yaya"), 164: ("yayalar[].kusurlar", "yaya"), 165: ("yayalar[].meslek", "yaya"),
    166: ("yolcular[].adi", "yolcu"), 167: ("yolcular[].adSoyad", "yolcu"), 168: ("yolcular[].tckn", "yolcu"), 169: ("yolcular[].dogumTarihi", "yolcu"),
    170: ("yolcular[].kazaSonucu", "yolcu"), 171: ("yolcular[].kurallar", "yolcu"), 172: ("yolcular[].aractaYer", "yolcu"), 173: ("yolcular[].guvenlikEkipmani", "yolcu"),
    174: ("yolcular[].kusurlar", "yolcu"), 175: ("yolcular[].meslek", "yolcu"),
}

GIRIS_CELLS = {
    "J2": "dosya.firma", "J4": "dosya.raporTuru", "M7": "dosya.personel", "M8": "dosya.il", "M9": "dosya.ilce", "M10": "dosya.mahalle",
    "M11": "dosya.mahkemeNoVeDosyaTuru", "N11": "dosya.mahkemeAdi", "M12": "dosya.dosyaNo", "M13": "dosya.suc",
}


def grs1_path(col: str, row: int):
    """('D', 104) → ('araclar[0].cinsi', 'arac', 0) ; bilinmiyorsa None."""
    spec = GRS1_ROWS.get(row)
    if not spec:
        return None
    path, kind = spec
    if kind in ("scalar", "derived"):
        return (path, kind, None) if col == "D" else None
    idx = ENTITY_COLS.get(col)
    if idx is None:
        return None
    return (path.replace("[]", f"[{idx}]"), kind, idx)
