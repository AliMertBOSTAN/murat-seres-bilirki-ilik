#!/usr/bin/env python3
"""
Faz 0 — İçerik paketlerini Excel çıkarımından üretir.

Girdi : scripts/extract/out/core, scripts/extract/out/gunes  (extract_workbook.py çıktısı)
Çıktı : content/core/**, content/modules/**, data/reference/**, tests/golden/expected.json,
        public/brand/*.png, docs/excel-analysis.md (otomatik bölüm)

Metinler elle kopyalanmaz; her şey hücre referansıyla birlikte taşınır.
"""
import json
import os
import re
import shutil
import sys
from collections import Counter, OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from lib.book import Book, split_a1  # noqa: E402
from lib.cards import CardParser, GROUP_BY_SHEET, PER_ENTITY, profile_signature, slugify, display_code, tr_upper  # noqa: E402
from lib.formula import parse, Ref, to_text  # noqa: E402
from lib.paths import GRS1_ROWS, GIRIS_CELLS  # noqa: E402
from openpyxl.utils import column_index_from_string as col_idx, get_column_letter as col_letter  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CORE = Book(os.path.join(ROOT, "scripts/extract/out/core"))
GUNES = Book(os.path.join(ROOT, "scripts/extract/out/gunes"))
CONTENT_VERSION = "1.0.0"
REPORT = {"notes": [], "inconsistencies": []}


def out(path, data):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    print(f"  ✓ {path}  ({os.path.getsize(full)//1024} KB)")


def note(msg):
    REPORT["notes"].append(msg)


def inconsistency(code, title, detail, cells=None):
    REPORT["inconsistencies"].append({"code": code, "title": title, "detail": detail, "cells": cells or []})


def clean(v):
    if v is None or v == 0 or v is False:
        return ""
    return str(v)


# ----------------------------------------------------------------------------
# 1. ETKEN KARTLARI
# ----------------------------------------------------------------------------
PROFILE_NAMES = {"3": "yol-cevre", "4": "arac", "5": "kisi", "6": "kisi", "9Y": "kisi"}
LABEL_FIELD = {"Açıklama": "aciklama", "Nedensellik": "nedensellik", "Müteala": "muteala", "Sorun açıklama": "sorun",
               "Tespit Yöntemi": "tespit", "Sorumlu Tespiti": "sorumlu", "Hakim Savcı Tespit": "hakimSavci"}


def build_factors():
    profiles = OrderedDict()
    factors_by_group = defaultdict(list)
    used_library_rows = set()
    ids = Counter()
    excel_card_map = []
    sample_entries = []
    entity2_report = []
    for sheet, group in GROUP_BY_SHEET.items():
        parser = CardParser(CORE, sheet)
        status_rows = parser.find_status_rows()
        cards = [parser.parse_card(r) for r in status_rows]
        for w in parser.warnings:
            note(f"[{sheet}] {w}")
        # Sayfa 4: Araç 2 sütunu (AB..AX) kırık referans analizi
        if sheet == "4":
            p2 = CardParser(CORE, sheet, col_offset=26)
            for sr in status_rows:
                try:
                    c2 = p2.parse_card(sr)
                except Exception as e:  # noqa: BLE001
                    entity2_report.append({"statusRow": sr, "error": str(e)[:200]})
                    continue
                bad = []
                for key in ("titleSource", "valueSource"):
                    bad.append((key, c2.get(key)))
                lib_refs = []
                for r in c2["rows"]:
                    src = r.get("source") or {}
                    if src.get("source"):
                        lib_refs.append(src["source"])
                entity2_report.append({"statusRow": sr, "title1": cards[status_rows.index(sr)]["title"], "title2": c2["title"],
                                       "valueSource2": c2["valueSource"], "libraryRefs2": lib_refs[:4]})
        for card in cards:
            sig = profile_signature(card["statusRule"])
            if sig not in profiles:
                base = PROFILE_NAMES[sheet]
                pid = base if base not in [p["id"] for p in profiles.values()] else f"{base}-varyant-{len(profiles)+1}"
                profiles[sig] = {"id": pid, "mapping": card["statusRule"]["mapping"], "else": card["statusRule"]["else"],
                                 "rawKeys": card["statusRule"]["rawKeys"], "excelFormula": card["statusRule"]["formula"],
                                 "firstSeen": f"{sheet}!V{card['statusRow']}", "sheets": [sheet]}
            elif sheet not in profiles[sig]["sheets"]:
                profiles[sig]["sheets"].append(sheet)
            pid = profiles[sig]["id"]
            fid_base = f"{group}.{slugify(card['title'])}"
            ids[fid_base] += 1
            fid = fid_base if ids[fid_base] == 1 else f"{fid_base}-{ids[fid_base]}"
            if ids[fid_base] > 1:
                inconsistency("DUP-TITLE", "Aynı başlık birden çok kartta", f"{card['title']!r} ({sheet} satır {card['titleRow']})", [f"{sheet}!B{card['titleRow']}"])
            if card["titleSource"].get("cell"):
                used_library_rows.add((card["titleSource"]["sheet"], int(re.search(r"\d+", card["titleSource"]["cell"]).group(0))))

            fields, extra, tespit, sorumlu, sample_muteala = {}, [], None, None, None
            options = OrderedDict()
            for row in card["rows"]:
                label = row["label"].strip()
                key = LABEL_FIELD.get(label)
                if key == "tespit":
                    tespit = row["tespit"]
                    continue
                if key == "sorumlu":
                    sorumlu = row["sorumlu"]
                    continue
                if key == "muteala":
                    sample_muteala = row.get("sampleValue") or row.get("sampleText")
                    continue
                src = row.get("source")
                if key in ("aciklama", "nedensellik", "sorun") and src:
                    src = dict(src); src["excelCell"] = f"E{row['row']}"
                    fields[key] = src
                    if src.get("kind") == "option":
                        for o in src["table"]:
                            options.setdefault(o["key"], {"label": o["key"], "row": o["row"]})[key] = o["text"]
                else:
                    extra.append({"label": label, "row": row["row"], "source": src, "sampleValue": row.get("sampleValue", row.get("sampleText"))})
            kinds = {v.get("kind") for v in fields.values()}
            text_level = "option" if kinds == {"option"} else ("factor" if "option" not in kinds else "mixed")
            factor = OrderedDict(
                id=fid, group=group, displayCode=display_code(card["title"]), title=card["title"], subTitle=card["subTitle"],
                aranan=card.get("aranan", ""), perEntity=PER_ENTITY.get(sheet),
                sourceRef={"sheet": sheet, "titleRow": card["titleRow"], "statusRow": card["statusRow"], "library": card["titleSource"]},
                valueSource=card["valueSource"], degerDurum=card.get("degerDurumParts") or ({"literal": card["degerDurumBasligi"]} if card.get("degerDurumBasligi") else None),
                statusProfile=pid, ekDosya=card["ekDosya"], kazadaDurumu=card["kazadaDurumu"],
                textLevel=text_level, fields=fields, options=list(options.values()), extraBlocks=extra,
                showInReport=True, draft=False, libraryRows=card.get("libraryRows", []),
                excelSample={"value": card.get("sampleValue"), "scale": card.get("sampleScale"), "incelemeDurumu": card.get("sampleIncelemeDurumu"),
                             "muteala": sample_muteala, "tespit": tespit, "sorumlu": sorumlu},
            )
            factors_by_group[group].append(factor)
            excel_card_map.append({"factorId": fid, "sheet": sheet, "titleRow": card["titleRow"], "valueRow": card["statusRow"] - 1, "statusRow": card["statusRow"],
                                   "cells": {"incelemeDurumu": f"E{card['statusRow']}", "muteala": f"E{card['statusRow']+3}", "durum": f"V{card['statusRow']}"}})
            sample_entries.append({"factorId": fid, "entityIndex": 0 if PER_ENTITY.get(sheet) else None,
                                   "selectedValue": card.get("sampleValue") if card["valueSource"].get("kind") != "input" else None,
                                   "incelemeDurumu": card.get("sampleIncelemeDurumu") or "", "muteala": "",  # Müteala kullanıcı alanı: boş başlat (§3.10)
                                   "excelMuteala": sample_muteala,
                                   "tespit": {"yontemler": [clean(x).strip() for x in (tespit or {}).get("yontemler", []) if x],
                                              "delilKodu": (tespit or {}).get("delilKodu"), "puanlar": (tespit or {}).get("puanlar"),
                                              "dogrulama": (tespit or {}).get("dogrulama")},
                                   "sorumlu": (sorumlu or {}).get("sorumlu"), "hakimSavciTespit": (sorumlu or {}).get("hakimSavci"),
                                   "altSecim": card["ekDosya"].get("value") if card["ekDosya"].get("kind") == "manual" else None})
    return factors_by_group, list(profiles.values()), used_library_rows, excel_card_map, sample_entries, entity2_report


HEAD_RE = re.compile(r"^\s*(\d+)(?:\.\d+)*\.?\s*\S")
GROUP_BY_NUMBER = {"1": "yer-zaman", "2": "yol-cevre", "3": "yol-cevre", "4": "arac", "5": "surucu", "6": "iz", "7": "iz", "8": "yolcu", "9": "yaya", "10": "olu-yarali", "11": "kaza-nedeni"}


def build_draft_factors(used_rows, existing_ids, used_titles=()):
    """Tanım B250:B1760 numaralı başlıkları (rapor sayfalarında kullanılmayan) taslak etken olarak taşır."""
    sh = CORE["Tanım"]
    heads = []
    for r in range(245, 1760):
        v = sh.val(f"B{r}")
        if isinstance(v, str) and HEAD_RE.match(v) and not re.match(r"^\s*\d+\s+[A-Za-zÇĞİÖŞÜçğıöşü]", v):
            heads.append((r, v.strip()))
    drafts = []
    ids = Counter(existing_ids)
    parser = CardParser(CORE, "3")
    section_titles = {}
    last_multi = None   # son çok seviyeli başlık (ör. 4.35.4) → tek seviyeli alt maddeler onun seçeneğidir
    last_section = None  # son bölüm başlığı (BÜYÜK HARF, tek seviyeli, ör. "10. ÖLÜ-YARALIYA AİT İZLER")
    single_counter = 0
    for i, (r, title) in enumerate(heads):
        if r < 302 or (365 <= r <= 376):
            continue  # Grş 1 giriş etiketleri (1.x, 3.-15. ve 6.x yolcu girişleri) — etken değil, giriş alanı
        is_single = re.match(r"^\s*\d+\.?\s+\S", title) and not re.match(r"^\s*\d+\.\d", title)
        body = re.sub(r"^\s*[\d\.\s]+", "", title)
        if is_single and body == tr_upper(body):
            last_section = (r, title); last_multi = None; single_counter = 0
            section_titles[title.split()[0].rstrip(".")] = title
            continue  # bölüm başlığı: etken değil
        if is_single and last_multi is not None:
            continue  # çok seviyeli bir etkenin numaralı seçeneği (ör. dorse tipleri, 2.13 alt maddeleri) — library_block içinde zaten taşınıyor
        if not is_single:
            last_multi = (r, title); single_counter = 0
        else:
            single_counter += 1
        if ("Tanım", r) in used_rows:
            continue
        if tr_upper(re.sub(r"\s+", " ", body)).strip() in used_titles:
            continue  # aynı başlık canlı bir kartta zaten var (ör. BİLGİ HESAP'tan referanslanan yaya kartları)
        num = re.match(r"\s*(\d+)", title).group(1)
        if is_single and last_section is not None:
            sec_num = last_section[1].split()[0].rstrip(".")
            group = GROUP_BY_NUMBER.get(sec_num, "diger")
            title = f"{sec_num}.{single_counter}. {body}"
        else:
            group = GROUP_BY_NUMBER.get(num, "diger")
        if title.startswith("4.35"):
            group = "dorse"
        fid_base = f"{group}.{slugify(title)}"
        ids[fid_base] += 1
        fid = fid_base if ids[fid_base] == 1 else f"{fid_base}-{ids[fid_base]}"
        block = parser.library_block("Tanım", r)
        head = block[0]["cells"] if block else {}
        nxt = block[1]["cells"] if len(block) > 1 else {}
        # İki sütun düzeni: A (C aranan, E kod, F ekdosya, G önlem, H uygunluk, I nedensellikYok, J sorun, K ekdosyaYaz)
        #                   B (sürücü/araç/yolcu/yaya bölümleri: H kod, I ekdosya, J önlem, K uygunluk, L, M, N)
        layout = "B" if isinstance(head.get("I"), str) and "Ek dosya" in str(head.get("I", "")) else ("A" if "Ek dosya" in str(head.get("F", "")) else "?")
        if layout == "A":
            texts = {"ekDosyaKod": clean(head.get("E")), "ekDosyaMetni": clean(head.get("F")), "onlemMetni": clean(head.get("G")), "uygunlukMetni": clean(head.get("H")),
                     "nedensellikYokMetni": clean(head.get("I")), "sorunMetni": clean(head.get("J")), "ekDosyaHazirlayiniz": clean(head.get("K"))}
        elif layout == "B":
            texts = {"ekDosyaKod": clean(head.get("H")), "ekDosyaMetni": clean(head.get("I")), "onlemMetni": clean(head.get("J")), "uygunlukMetni": clean(head.get("K")),
                     "nedensellikYokMetni": clean(head.get("L")), "sorunMetni": clean(head.get("M")), "ekDosyaHazirlayiniz": clean(head.get("N"))}
        else:
            texts = {}
        fields = {}
        for k, col in (("nedensellik", "C"), ("aciklama", "D"), ("sonuc", "E"), ("sorumlular", "F"), ("tespitYontemi", "G")):
            if clean(nxt.get(col)):
                fields[k] = {"kind": "text", "text": clean(nxt.get(col)), "source": f"Tanım!{col}{block[1]['row']}"}
        options = []
        for b in block[2:]:
            c = b["cells"]
            if isinstance(c.get("B"), str) and not HEAD_RE.match(c["B"]):
                options.append({"label": c["B"].strip(), "nedensellik": clean(c.get("C")), "aciklama": clean(c.get("D")), "sonuc": clean(c.get("E")), "row": b["row"]})
        drafts.append(OrderedDict(
            id=fid, group=group, displayCode=display_code(title), title=title, subTitle=clean(nxt.get("B")) if not HEAD_RE.match(clean(nxt.get("B")) or "x") else "",
            aranan=clean(head.get("C")) if str(head.get("C", "")).startswith("Aranan") else "", perEntity={"arac": "arac", "dorse": "arac", "surucu": "surucu", "yolcu": "yolcu", "yaya": "yaya"}.get(group),
            sourceRef={"sheet": None, "library": {"sheet": "Tanım", "cell": f"B{r}"}, "layout": layout},
            valueSource={"kind": "cardSelect"}, statusProfile={"arac": "arac", "dorse": "arac", "yol-cevre": "yol-cevre", "yer-zaman": "yol-cevre"}.get(group, "kisi"),
            ekDosya={"kind": "rule", "hideWhen": ["Aranmadı"], "kod": texts.get("ekDosyaKod", ""), "metin": texts.get("ekDosyaMetni", "")},
            kazadaDurumu={"kind": "rule", "branches": [{"when": "Aranmadı", "on": "incelemeDurumu", "parts": [{"kind": "text", "text": texts.get("uygunlukMetni", "")}]},
                                                       {"when": "Var", "on": "incelemeDurumu", "parts": [{"kind": "text", "text": texts.get("uygunlukMetni", "")}]}],
                          "else": [{"kind": "value"}, {"kind": "text", "text": texts.get("onlemMetni", "")}]} if texts else {"kind": "none"},
            textLevel="factor", fields=fields, options=options, extraBlocks=[], texts=texts,
            showInReport=False, draft=True, libraryRows=block, excelSample=None,
        ))
    out("content/core/factors/sections.json", {"source": "Tanım B sütunu bölüm başlıkları", "sections": section_titles})
    return drafts, heads


# ----------------------------------------------------------------------------
# 2. LİSTELER (veri doğrulamaları)
# ----------------------------------------------------------------------------
def build_lists():
    lists = OrderedDict()
    usage = []
    for sname, sh in CORE.sheets.items():
        for dv in sh.data.get("x14DataValidations", []) + sh.data.get("dataValidations", []):
            f1 = dv.get("formula1")
            if not f1 or dv.get("type") not in ("list", None):
                continue
            ref = f1 if "!" in f1 else f"'{sname}'!{f1}"
            try:
                src_sheet, rng, vals = CORE.list_from_ref(ref)
            except Exception as e:  # noqa: BLE001
                inconsistency("DV-REF", "Veri doğrulaması çözümlenemedi", f"{sname} {dv.get('sqref')} → {f1} ({e})", [f"{sname}!{dv.get('sqref')}"])
                continue
            lid = f"{slugify(src_sheet)}-{rng.replace(':', '-').lower()}"
            if lid not in lists:
                lists[lid] = {"id": lid, "source": f"{src_sheet}!{rng}", "items": [str(v).strip() if isinstance(v, str) else v for v in vals], "usedBy": []}
            lists[lid]["usedBy"].append({"sheet": sname, "cells": dv.get("sqref")})
            usage.append({"sheet": sname, "cells": dv.get("sqref"), "listId": lid})
    # Kart içi alanlar için standart listeler (adlandırılmış)
    named = {
        "inceleme-durumu": "Tanım!D23:D32", "hakim-savci-tespit": "Tanım!D37:D45", "sorumlu": "Tanım!E40:E60",
        "tespit-yontemi": "Tanım!C96:C110", "tespit-dogrulama": "Tanım!B107:B111", "delil-kodu": "Tanım!C2000:C2080",
        "skala-5": "BİLGİ HESAP!B71:B75", "gun-skala": "Tanım!G97:G103", "siklik": "Tanım!AB2:AB27", "yol-kesim": "Tanım!AP2:AP53",
        "mahkeme": "Tanım!B46:B61", "rapor-turu": "Tanım!E2:E7", "firma": "Tanım!E86:E113", "personel": "Tanım!E86:E108", "suc-turu": "Tanım!D60:D76",
        "il": "Tanım!G4:G85", "inceleme-turu": "Tanım!C83:C88", "gorevlendirme-dayanagi": "Tanım!C90:C96",
    }
    for nid, ref in named.items():
        s, rng, vals = CORE.list_from_ref(ref)
        lists[nid] = {"id": nid, "source": f"{s}!{rng}", "items": [str(v).strip() if isinstance(v, str) else v for v in vals], "usedBy": lists.get(nid, {}).get("usedBy", []), "named": True}
    return lists, usage


# ----------------------------------------------------------------------------
# 3. REFERANS VERİLER
# ----------------------------------------------------------------------------
def build_reference():
    T = CORE["Tanım"]
    # il → ilçe (AG:AI, satır 3..)
    il_ilce = OrderedDict()
    r = 3
    while True:
        il = T.val(f"AG{r}")
        if il is None:
            break
        il_ilce.setdefault(str(il), []).append(str(T.val(f"AI{r}")))
        r += 1
    # il > ilçe > mahalle (CU, CW, CX, CZ)
    mah = OrderedDict()
    r = 3
    n = 0
    while True:
        il = T.val(f"CU{r}")
        if il is None:
            break
        ilce = str(T.val(f"CW{r}") or "")
        m = str(T.val(f"CX{r}") or "")
        belde = str(T.val(f"CZ{r}") or "")
        mah.setdefault(str(il), OrderedDict()).setdefault(ilce, []).append({"mahalle": m, "belde": belde} if belde and belde != f"{ilce}-İLÇE MERKEZİ" else m)
        r += 1
        n += 1
    out("data/reference/il-ilce.json", {"version": "2024", "source": "EĞİTİM 001.xlsx › Tanım!AG3:AI997", "count": sum(len(v) for v in il_ilce.values()), "data": il_ilce})
    # mahalle verisi büyük → il başına parça
    os.makedirs(os.path.join(ROOT, "data/reference/mahalle"), exist_ok=True)
    index = {}
    for il, ilceler in mah.items():
        fname = f"data/reference/mahalle/{slugify(il)}.json"
        out(fname, {"il": il, "ilceler": ilceler})
        index[il] = fname.split("/")[-1]
    out("data/reference/mahalle/index.json", {"version": "2024", "source": "EĞİTİM 001.xlsx › Tanım!CU3:CZ33525", "rowCount": n, "files": index})

    # il istatistikleri (G:AA + BY:CN)
    headers_g = {c: clean(T.val(f"{c}2")) for c in "GHIJKLMNOPQRSTUVWXYZ"}
    headers_g["AA"] = clean(T.val("AA2"))
    il_stats = []
    for rr in range(3, 86):
        il = T.val(f"G{rr}")
        if il is None:
            continue
        rec = OrderedDict(il=str(il), nufus2023=T.val(f"H{rr}"),
                          tasit={"toplam": T.val(f"I{rr}"), "otomobil": T.val(f"J{rr}"), "minibus": T.val(f"K{rr}"), "otobus": T.val(f"L{rr}"), "kamyonet": T.val(f"M{rr}"),
                                 "kamyon": T.val(f"N{rr}"), "motosiklet": T.val(f"O{rr}"), "ozelAmacli": T.val(f"P{rr}"), "traktor": T.val(f"Q{rr}")},
                          kaza={"toplam": T.val(f"R{rr}"), "aracSayisi": T.val(f"S{rr}"), "olumluYaralanmali": T.val(f"T{rr}"), "olu": {"toplam": T.val(f"U{rr}"), "kazaYerinde": T.val(f"V{rr}"), "kazaSonrasi": T.val(f"W{rr}")},
                                "yarali": T.val(f"X{rr}"), "her100Kisi": T.val(f"Y{rr}"), "otomobilSayisi": T.val(f"Z{rr}"), "nufusOtomobil": T.val(f"AA{rr}")})
        # BY bloğu (aynı satır düzeni: BY3 Toplam, BY4 Adana …)
        if T.val(f"BY{rr}") is not None:
            rec["by"] = {"il": T.val(f"BY{rr}"), "kaza2023": T.val(f"BZ{rr}"), "aracSayisi": T.val(f"CA{rr}"), "olumluYaralanmali": T.val(f"CB{rr}"), "oluToplam": T.val(f"CC{rr}"),
                         "oluYerinde": T.val(f"CD{rr}"), "oluSonrasi": T.val(f"CE{rr}"), "yarali": T.val(f"CF{rr}"), "nufus": T.val(f"CH{rr}"),
                         "oran": {"kazaAracPct": T.val(f"CI{rr}"), "olumluAracPct": T.val(f"CJ{rr}"), "oluOlumluPct": T.val(f"CK{rr}"), "yaraliOlumluPct": T.val(f"CL{rr}"), "yaraliOran": T.val(f"CM{rr}"), "fark": T.val(f"CN{rr}")}}
        il_stats.append(rec)
    # AL sütunu il sırası → KGM satırındaki BW (ilçe kaza 5 yıllık) — Excel'in VLOOKUP(il, AL3:BX5000, 38) davranışı
    al_rows = []
    for rr in range(3, 90):
        il = T.val(f"AL{rr}")
        if il is None:
            continue
        al_rows.append({"il": str(il), "row": rr, "bw_ilceKazaSayisi": T.val(f"BW{rr}"), "bx_yolKazaSayisi": T.val(f"BX{rr}")})
    out("data/reference/il-istatistik-2023.json", {"version": "2023/2024", "source": "EĞİTİM 001.xlsx › Tanım!G2:AA85 ve BY3:CN85", "headers": headers_g,
                                                   "constants": {"CI1": T.val("CI1"), "CJ1": T.val("CJ1")}, "ilceKazaLookupAL": al_rows, "data": il_stats})
    # ilçe nüfus
    ilce = []
    for rr in range(2, 980):
        il = T.val(f"DD{rr}")
        if il is None:
            continue
        ilce.append({"il": str(il), "ilce": str(T.val(f"DE{rr}")), "nufus2023": T.val(f"DF{rr}"), "dg": T.val(f"DG{rr}"), "dh": T.val(f"DH{rr}"), "di": T.val(f"DI{rr}")})
    out("data/reference/ilce-nufus-2023.json", {"version": "2023", "source": "EĞİTİM 001.xlsx › Tanım!DD2:DI975", "headers": {"DD": clean(T.val("DD1")), "DE": clean(T.val("DE1")), "DF": clean(T.val("DF1"))}, "data": ilce})
    # KGM trafik sayımı AT:BX
    kgm = []
    hdr1 = {c: clean(T.val(f"{c}1")) for c in [col_letter(i) for i in range(col_idx("AT"), col_idx("BX") + 1)]}
    hdr2 = {c: clean(T.val(f"{c}2")) for c in hdr1}
    rr = 3
    while True:
        key = T.val(f"AT{rr}")
        if key is None and T.val(f"AU{rr}") is None:
            if rr > 4200:
                break
            rr += 1
            if rr > 4200:
                break
            continue
        cls = []
        for base in ("BB", "BF", "BJ", "BN", "BR"):
            b = col_idx(base)
            cls.append({"yogt": T.val(f"{col_letter(b)}{rr}"), "ortHiz": T.val(f"{col_letter(b+1)}{rr}"), "p85": T.val(f"{col_letter(b+2)}{rr}"), "hizPct": T.val(f"{col_letter(b+3)}{rr}")})
        kgm.append({"key": str(key) if key is not None else None, "blNo": T.val(f"AU{rr}"), "il": T.val(f"AV{rr}"), "kkno": T.val(f"AW{rr}"), "dilimNo": T.val(f"AX{rr}"),
                    "uzunlukKm": T.val(f"AY{rr}"), "sayimTuru": T.val(f"AZ{rr}"), "toplam": T.val(f"BA{rr}"), "siniflar": cls, "agirTasitPct": T.val(f"BV{rr}"),
                    "ilceKazaSayisi": T.val(f"BW{rr}"), "yolKazaSayisi": T.val(f"BX{rr}"), "row": rr})
        rr += 1
        if rr > 4200:
            break
    out("data/reference/kgm-trafik-sayim.json", {"version": "KGM (yıl belirtilmemiş)", "source": "EĞİTİM 001.xlsx › Tanım!AT3:BX4099", "headers": {"row1": hdr1, "row2": hdr2},
                                                 "columnIndexNote": "VLOOKUP sütun indeksleri AT=1: 6=uzunlukKm, 8=toplam, 26=siniflar[4].ortHiz, 27=siniflar[4].p85, 31=yolKazaSayisi", "data": kgm})
    # taşıt sayıları ayrı dosya (G:Q yalnız)
    out("data/reference/tasit-sayilari-2024.json", {"version": "2024", "source": "EĞİTİM 001.xlsx › Tanım!G2:Q85",
                                                    "data": [{"il": s["il"], **s["tasit"]} for s in il_stats]})
    return len(il_ilce), n, len(il_stats), len(ilce), len(kgm)


# ----------------------------------------------------------------------------
# 4. BİLGİ BANKASI, META, HUKUKİ METİN, DELİL KODLARI
# ----------------------------------------------------------------------------
def sheet_rows_dump(sheet, r0, r1, cols=None):
    sh = CORE[sheet]
    rows = []
    for r in range(r0, r1 + 1):
        cells = {c: (x.get("cached") if "f" in x else x.get("v")) for c, x in sh.row_cells(r).items() if (cols is None or c in cols)}
        cells = {k: v for k, v in cells.items() if v not in (None, "", 0)}
        if cells:
            rows.append({"row": r, "cells": cells})
    return rows


def build_knowledge():
    T = CORE["Tanım"]
    # Rapor meta (Tanım B2:E23)
    meta = OrderedDict(
        firma=clean(T.val("B2")), raporTuruVaryantlari=[clean(T.val(f"E{r}")) for r in range(2, 8) if clean(T.val(f"E{r}"))],
        birim=clean(T.val("C5")), konu=clean(T.val("C6")), dosyaYeri=clean(T.val("C7")), hazirlayan=clean(T.val("C8")), dokNo=clean(T.val("C9")),
        hazTarihi=clean(T.val("C11")), isoBelge=clean(T.val("C12")), bagOlAyGun=clean(T.val("C13")), revizyonNo=clean(T.val("C15")), revizyonTarihi=clean(T.val("C16")),
        klasorNo=clean(T.val("C17")), arsivYeri=clean(T.val("C18")), yenileyen=clean(T.val("C19")), onaylayan=clean(T.val("C20")),
        altbilgiNotu=clean(T.val("B23")), birimRapor=clean(CORE.val("3", "E5")), yenileyenRapor=clean(CORE.val("3", "L6")),
        etiketler={f"B{r}": clean(T.val(f"B{r}")) for r in range(2, 24) if clean(T.val(f"B{r}"))},
        basliklar={"dokNo": "Dok.No:", "sayfaNo": "Sayfa No:", "hazTarihi": "Haz.Tarihi:", "revizyonNo": "Revizyon No", "revizyonTarihi": "Rvzyn Tarihi", "isoBelge": "İso Belge",
                   "bagOlAyGun": "Bağ.Ol.Ay-Gün", "yil": "Yıl", "klasorNo": "Klasör No :", "arsivYeri": "Arşiv Yeri :", "birim": "Birim :", "konu": "Konu ", "yenileyen": "Yenileyen"},
        source="Tanım!B2:E23, 3!B2:X6",
    )
    out("content/core/report-meta.json", meta)
    # Taraf etiket setleri (A64:D79)
    sets = []
    for col, key in (("A", "ceza"), ("B", "hukuk"), ("C", "savcilik"), ("D", "icra")):
        sets.append({"id": key, "title": clean(T.val(f"{col}64")), "labels": [clean(T.val(f"{col}{r}")) for r in range(65, 80)], "excelIndex": {"A": 1, "B": 2, "C": 3, "D": 4}[col]})
    out("content/core/party-labels.json", {"source": "Tanım!A64:D79 (Grş 1!B6:B20 formülleri)", "selectorCell": "Giriş!M11", "sets": sets,
                                           "note": "Giriş!M11 hem mahkeme numarası hem etiket seti seçicidir (§3.4). Webde iki alan: mahkemeNo ve dosyaTuru."})
    # Hukuki metinler
    legal = {"source": "Tanım!B81:D94 ve sayfa 1.!B8:B13", "variants": [clean(T.val(f"{c}81")) for c in "BCD"],
             "blocks": [{"title": clean(T.val("B82")), "paragraphs": [clean(T.val(f"B{r}")) for r in range(83, 88)], "rows": "B83:B87"},
                        {"title": clean(T.val("B89")), "paragraphs": [clean(T.val(f"B{r}")) for r in range(90, 95)], "rows": "B90:B94"}],
             "sheet1Formulas": {a: CORE["1."].formula(a) for a in ("B8", "B9", "B10", "B11", "B12", "B13")},
             "sheet1Text": [clean(CORE.val("1.", f"B{r}")) for r in range(8, 14)]}
    out("content/core/legal-texts.json", legal)
    # Delil kodları
    codes = []
    for r in range(2000, 2081):
        c = clean(T.val(f"C{r}"))
        if c:
            codes.append({"kod": c, "sira": T.val(f"D{r}"), "not": clean(T.val(f"E{r}")), "row": r})
    mapping = []
    for r in range(41, 84):
        if clean(CORE.val("Sayfa5", f"B{r}")):
            mapping.append({"eskiKod": clean(CORE.val("Sayfa5", f"B{r}")), "turkceKod": clean(CORE.val("Sayfa5", f"C{r}")), "ad": clean(CORE.val("Sayfa5", f"D{r}"))})
    out("content/core/evidence-codes.json", {"source": "Tanım!C2000:E2080 + Sayfa5!B41:D83", "codes": codes, "mapping": mapping,
                                             "sayfa5Diger": sheet_rows_dump("Sayfa5", 1, 39) + sheet_rows_dump("Sayfa5", 84, 135)})
    # Bilgi bankası: eğitimler (Sayfa3), yetki belgeleri (Sayfa4), BİLGİ HESAP ham, 2. sayfa metin blokları
    out("content/core/knowledge/surus-egitimleri.json", {"source": "Sayfa3!A1:D91", "rows": sheet_rows_dump("Sayfa3", 1, 91)})
    out("content/core/knowledge/yetki-belgeleri.json", {"source": "Sayfa4!B3:G16", "columns": [clean(CORE.val("Sayfa4", f"{c}3")) for c in "BCD"],
                                                        "rows": [{"kod": clean(CORE.val("Sayfa4", f"B{r}")), "ad": clean(CORE.val("Sayfa4", f"C{r}")), "aciklama": clean(CORE.val("Sayfa4", f"D{r}")),
                                                                  "F": CORE.val("Sayfa4", f"F{r}"), "G": CORE.val("Sayfa4", f"G{r}")} for r in range(4, 17)]})
    out("content/core/knowledge/bilgi-hesap.json", {"source": "BİLGİ HESAP!A1:AM1289 (bilgi bankası v2, 'GÜDÜL ÇALIŞMASI')", "rows": sheet_rows_dump("BİLGİ HESAP", 1, 1289)})
    # 2. sayfa metin blokları: başlıklar B/O sütununda, maddeler E/R sütununda
    S2 = CORE["2."]
    blocks = []
    for (hcol, icol) in (("B", "E"), ("O", "R")):
        cur = None
        for r in range(37, 84):
            h = clean(S2.val(f"{hcol}{r}"))
            item = clean(S2.val(f"{icol}{r}"))
            weight = S2.val("Z%d" % r) if icol == "R" else None
            if h and not h.startswith("Yapılan"):
                cur = {"title": h, "cell": f"{hcol}{r}", "items": []}
                blocks.append(cur)
            if item and cur is not None:
                cur["items"].append({"text": item, "cell": f"{icol}{r}", **({"weight": weight} if weight is not None else {}),
                                     **({"value": S2.val(f"J{r}")} if hcol == "B" and S2.val(f"J{r}") is not None else {})})
    out("content/core/knowledge/istatistik-metinleri.json", {"source": "2.!B37:Z84", "blocks": blocks, "footnote": clean(S2.val("B84")),
                                                             "basliklar": {a: clean(S2.val(a)) for a in ("B29", "B31", "B33", "B35", "B19", "J19", "R19", "B20", "J20", "R20", "B21", "J21", "R21", "B22", "J22", "R22", "R23")}})
    # Sabitler
    consts = OrderedDict(
        source="2.!D23:O23, AC12, AD2:AE10, Z81:Z83; 19!AF19:AH21, R87:AL87; Güneş sınıflandırma!B9:I13",
        oranSabitleri={"sabit1_D23": S2.val("D23"), "sabit2_G23": S2.val("G23"), "sabit3_K23": S2.val("K23"), "sabit4_O23": S2.val("O23")},
        riskKatsayisi_AC12=S2.val("AC12"),
        siklikTablosu=[{"etiket": clean(S2.val(f"AE{r}")), "katsayi": S2.val(f"AD{r}"), "cell": f"AD{r}"} for r in range(2, 11) if S2.val(f"AD{r}") is not None],
        siklikEslemesi_AD14={"1 Hafta": "AD3", "1 Gün": "AD2", "1 Ay": "AD4", "3 Ay": "AD5", "6 Ay": "AD6", "1 Yıl": "AD7", "5 Yıl": "AD2", "10 Yıl": "AD9"},
        siklikEslemesiFormul=S2.formula("AD14"),
        onlenebilecekKazalar=[{"ad": clean(S2.val(f"R{r}")), "agirlik": S2.val(f"Z{r}")} for r in range(81, 84)],
        kacinma={"puanTablosu": [{"durum": clean(CORE.val("19", f"B{r}")), "aciklama": clean(CORE.val("19", f"V{r}")), "AF": CORE.val("19", f"AF{r}"), "AG": CORE.val("19", f"AG{r}")} for r in (19, 20, 21)],
                 "bilincliTaksirKusurDegeri_AH21": CORE.val("19", "AH21"),
                 "senaryoCarpanlari": {"0": 0, "1": 5, "2": 2, "3": 3, "4": 4, "5": 0}, "senaryoFormul": CORE["19"].formula("AR13"),
                 "kurumCarpanlari": [{"etiket": clean(CORE.val("19", f"{c}85")), "carpan": CORE.val("19", f"{c}87")} for c in ("R", "W", "AB", "AG", "AL")],
                 "kurumFormul": CORE["19"].formula("AR89"), "senaryolar": [clean(CORE.val("19", f"H{r}")) for r in range(13, 18)],
                 "kurumSenaryolar": [{"puan": CORE.val("19", f"G{r}"), "ad": clean(CORE.val("19", f"H{r}")), "aciklama": clean(CORE.val("19", f"O{r}"))} for r in range(90, 95)]},
        gunesThetaBantlari=[{"aralik": clean(GUNES.val("sınıflandırma", f"B{r}")), "max": [5, 10, 20, 45, 180][r - 9], "sinif": clean(GUNES.val("sınıflandırma", f"E{r}")), "K": GUNES.val("sınıflandırma", f"I{r}")} for r in range(9, 14)],
    )
    out("content/core/rules/constants.json", consts)
    # Renk kuralları (x14 koşullu biçimler) → durum çipleri
    colors = []
    for sname in ("3", "4", "5", "6", "9Y", "Grş 1", "2."):
        for cf in CORE[sname].data.get("x14ConditionalFormatting", []):
            for rule in cf["rules"]:
                colors.append({"sheet": sname, "sqref": cf["sqref"], "operator": rule.get("operator"), "formulas": rule.get("formulas"), "fill": rule.get("fill")})
    out("content/core/rules/colors.json", {"source": "x14 koşullu biçimlendirme (sayfa 3/4/5/6/9Y/Grş 1/2.)", "theme": CORE.workbook["themeColors"],
                                           "statusColors": {"ETKEN": "#FF0000", "Yok": "#FF0000", "ETKEN DEĞİL": "#92D050", "Yeterli": "#92D050", "Var": "#92D050", "Aranmadı": "#92D050",
                                                            "İNCELENMELİ": "#00B0F0", "İNCELEMELİ": "#00B0F0", "Yetersiz": "#00B0F0", "Davranış": "#5B9BD5", "Belirsiz": "#5B9BD5", "ÖZEL İSTEMLİ": "#8497B0"},
                                           "scale5": {"Çok İyi": "#00B050", "İyi": "#92D050", "Normal": "#00B0F0", "Kötü": "#FFC000", "Çok Kötü": "#FF0000"},
                                           "rules": colors})


# ----------------------------------------------------------------------------
# 5. ÖRNEK DOSYA, EXCEL HARİTASI, ALTIN BEKLENTİLER
# ----------------------------------------------------------------------------
def build_sample_case(sample_entries):
    G = CORE["Grş 1"]
    Gi = CORE["Giriş"]

    def set_path(obj, path, value):
        parts = re.split(r"\.(?![^\[]*\])", path)
        cur = obj
        for i, p in enumerate(parts):
            m = re.match(r"(\w+)\[(\d+)\]$", p)
            last = i == len(parts) - 1
            if m:
                name, idx = m.group(1), int(m.group(2))
                arr = cur.setdefault(name, [])
                while len(arr) <= idx:
                    arr.append({})
                if last:
                    arr[idx] = value
                else:
                    cur = arr[idx]
            else:
                if last:
                    cur[p] = value
                else:
                    cur = cur.setdefault(p, {})

    case = OrderedDict(id="ornek-excel", title="Excel örnek dosyası (EĞİTİM 001)", createdAt="2025-09-01", excelCached=True)
    for cell, path in GIRIS_CELLS.items():
        v = Gi.val(cell)
        if v is not None:
            set_path(case, path, v)
    case["dosya"]["mahkemeNo"] = Gi.val("M11")
    case["dosya"]["dosyaTuru"] = {1: "ceza", 2: "hukuk", 3: "savcilik", 4: "icra"}.get(Gi.val("M11"), "ceza")
    case["dosya"]["dosyaNo"] = clean(Gi.val("M12"))
    for row, (path, kind) in GRS1_ROWS.items():
        if kind == "derived":
            continue
        cols = ("D",) if kind == "scalar" else ("D", "E", "F")
        for ci, col in enumerate(cols):
            v = G.val(f"{col}{row}")
            if v is None:
                continue
            if isinstance(v, (int, float)) and "tckn" in path:
                v = str(v)
            set_path(case, path.replace("[]", f"[{ci}]"), v)
    # Giriş'teki il/ilçe Grş 1'e formülle gelir; tutarlılık için dosya.* kullan
    S2 = CORE["2."]
    case["istatistik"] = OrderedDict(yolKesimNo=S2.val("J15"), yon=S2.val("U15"), hareket=S2.val("X15"), yayaKatsayi=S2.val("U17"), aracKatsayi=S2.val("X17"),
                                     siklikArac=S2.val("E63"), siklikYaya=S2.val("E64"), siklikAracCarpan=S2.val("J63"), siklikYayaCarpan=S2.val("J64"),
                                     saatler={"olay": clean(S2.val("M13")), "incelemeBaslama": clean(S2.val("Q13")), "ambulans": clean(S2.val("U13")), "ihbar": clean(S2.val("Y13"))},
                                     metinSecimleri={}, dagitim={"geregiIcin": [clean(S2.val("E73"))], "bilgiIcin": [clean(S2.val(f"E{r}")) for r in range(74, 84)]})
    K = CORE["19"]
    case["modules"] = {"kacinma-mutalaa": {
        "yolHizi": K.val("M8"), "kavsakHizi": K.val("AB8"),
        "suruculer": [
            {"aldigiYol": K.val("R10"), "yolunZamani": K.val("V10"), "temelKusurPuani": K.val("AR12"), "senaryoPuanlari": [K.val(f"AS{r}") or 0 for r in range(13, 18)],
             "senaryoMutealalari": [clean(K.val(f"L{r}")) for r in range(13, 18)], "muteala": clean(K.val("G11")), "sonucMuteala": clean(K.val("F18")), "frenIzi": clean(K.val("AN10"))},
            {"aldigiYol": K.val("R32"), "yolunZamani": K.val("V32"), "temelKusurPuani": K.val("AR34"), "senaryoPuanlari": [K.val(f"AS{r}") or 0 for r in range(35, 40)],
             "senaryoMutealalari": [clean(K.val(f"L{r}")) for r in range(35, 40)], "muteala": clean(K.val("G33")), "sonucMuteala": clean(K.val("F40")), "frenIzi": clean(K.val("AN32"))},
        ],
        "kurumlar": [
            {"kurum": clean(K.val("J85")), "sube": clean(K.val("J86")), "zilyetlik": clean(K.val("B87")), "temelKusur": K.val("O87"), "bilgiSuresi": clean(K.val("AQ86")), "senaryoPuani": K.val("AS92"), "senaryoIndex": 2, "muteala": clean(K.val("G88"))},
            {"kurum": clean(K.val("J117")), "sube": clean(K.val("J118")), "zilyetlik": clean(K.val("B119")), "temelKusur": K.val("O119"), "bilgiSuresi": clean(K.val("AQ119")), "senaryoPuani": K.val("AS124"), "senaryoIndex": 2, "muteala": clean(K.val("G120"))},
        ]}}
    case["factorEntries"] = sample_entries
    # Kişisel veri yer tutucuları: Excel'deki örnek değerler zaten yer tutucu; TCKN'leri maskeleyelim
    for key in ("suruculer", "yayalar", "yolcular"):
        for ent in case.get(key, []):
            if isinstance(ent, dict) and ent.get("tckn"):
                ent["tckn"] = "***********"
    out("content/core/sample-case.json", case)


def build_expected():
    exp = {"source": "EĞİTİM 001.xlsx önbelleğe alınmış (cached) hesap değerleri", "cells": []}
    for sname in ("Giriş", "Grş 1", "1.", "2.", "3", "sonuç1", "4", "5", "6", "9Y", "19"):
        sh = CORE[sname]
        for a1, c in sorted(sh.cells.items(), key=lambda kv: (split_a1(kv[0])[1], col_idx(split_a1(kv[0])[0]))):
            if "f" in c:
                exp["cells"].append({"sheet": sname, "cell": a1, "formula": c["f"], "cached": c.get("cached"), **({"arrayRef": c["arrayRef"]} if c.get("arrayRef") else {})})
            elif sname == "sonuç1":
                exp["cells"].append({"sheet": sname, "cell": a1, "formula": "(dizi taşması)", "cached": c.get("v")})
    # Güneş: Excel'in (hatalı) kayıtlı değerleri de saklanır; doğru değerler golden testte ayrı tanımlanır
    exp["gunesExcelCached"] = {f"{s}!{a}": GUNES[s].val(a) for s, a in (("Hesap", "W19"), ("Hesap", "W20"), ("Hesap", "W21"), ("sınıflandırma", "W9"), ("sınıflandırma", "W10"))}
    out("tests/golden/expected.json", exp)
    return len(exp["cells"])


# ----------------------------------------------------------------------------
# 6. GÜNEŞ MODÜLÜ İÇERİĞİ
# ----------------------------------------------------------------------------
def build_gunes_content():
    def rows(sheet, r0, r1):
        sh = GUNES[sheet]
        res = []
        for r in range(r0, r1 + 1):
            cells = {c: (x.get("cached") if "f" in x else x.get("v")) for c, x in sh.row_cells(r).items()}
            cells = {k: v for k, v in cells.items() if v not in (None, "", 0)}
            if cells:
                res.append({"row": r, "cells": cells, "formulas": {c: x["f"] for c, x in sh.row_cells(r).items() if "f" in x}})
        return res
    data = OrderedDict(
        source="2.2 Gunes_Etkenligi_Model.xlsx", sheets=[s["name"] for s in GUNES.workbook["sheets"]],
        model={"baslik": clean(GUNES.val("model", "B7")), "aciklama": clean(GUNES.val("model", "B9")), "kullanim": [clean(GUNES.val("model", f"B{r}")) for r in range(11, 15)],
               "notlarKaynak": clean(GUNES.val("model", "B17"))},
        vakaGirisi=[{"alan": clean(GUNES.val("Vaka_Girişi", f"B{r}")), "deger": GUNES.val("Vaka_Girişi", f"I{r}"), "not": clean(GUNES.val("Vaka_Girişi", f"M{r}"))} for r in range(10, 19)],
        hesapSatirlari=rows("Hesap", 9, 37), siniflandirma=rows("sınıflandırma", 8, 16), raporCikti=rows("Rapor_cıktı", 8, 21),
        kurumsalModel=[clean(GUNES.val("Kurumsal_Model", f"B{r}")) for r in range(7, 19)],
        raporCumlesiFormulu=GUNES["Rapor_cıktı"].formula("B21"),
        externalLinks=GUNES.workbook["externalLinks"], hyperlinks={s: GUNES[s].data["hyperlinks"] for s in GUNES.sheets},
    )
    out("content/modules/gunes-etkenligi/content.json", data)


# ----------------------------------------------------------------------------
# 7. DOKÜMANTASYON (otomatik bölüm)
# ----------------------------------------------------------------------------
def write_analysis_doc(factors_by_group, drafts, heads, profiles, lists, ref_counts, n_expected, entity2_report):
    wb = CORE.workbook
    lines = ["# Excel Analizi (otomatik üretilmiş bölüm)", "", f"Kaynak: `{wb['source']}` ve `2.2 Gunes_Etkenligi_Model.xlsx`. Üretici: `scripts/extract/build_content.py`.", "",
             "## 1. Sayfa envanteri", "", "| # | Sayfa | Boyut | Formül | Dizi | Değer | x14 DV | DV | x14 CF | Köprü | Görsel |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    for s in wb["sheets"]:
        lines.append(f"| {s['index']} | `{s['name']}` | {s['dimension']} | {s['formulas']} | {s['arrayFormulas']} | {s['values']} | {s['x14Validations']} | {s['validations']} | {s['x14CondFmt']} | {s['hyperlinks']} | {s['drawings']} |")
    lines += ["", "## 2. Sayfalar arası bağımlılık grafiği (formül referans sayısı)", "", "```mermaid", "graph LR"]
    for r in wb["crossSheetReferences"]:
        if r["from"] == r["to"]:
            continue
        a = re.sub(r"[^A-Za-z0-9]", "_", r["from"]) or "x"
        b = re.sub(r"[^A-Za-z0-9]", "_", r["to"]) or "y"
        lines.append(f'  {a}["{r["from"]}"] -->|{r["count"]}| {b}["{r["to"]}"]')
    lines += ["```", "", "| Kaynak sayfa | Hedef sayfa | Referans |", "|---|---|---|"]
    for r in wb["crossSheetReferences"]:
        lines.append(f"| `{r['from']}` | `{r['to']}` | {r['count']} |")
    lines += ["", "## 3. Dış bağlantılar", ""]
    for l in wb["externalLinks"]:
        cached = {k: len(v) for k, v in l["cachedValues"].items() if v}
        lines.append(f"- `{l['rId']}` → `{l['target']}` — sayfalar: {', '.join(l['sheetNames'][:12])}{' …' if len(l['sheetNames']) > 12 else ''}; önbellekli hücreler: {cached}")
    lines += ["", "## 4. Tanım formül yoğunluğu (ilk 10)", ""]
    for fn, n in list(next(s for s in wb["sheets"] if s["name"] == "Tanım")["topFunctions"].items())[:10]:
        lines.append(f"- `{fn}`: {n}")
    lines += ["", "## 5. Etken kartları (rapor sayfalarından çıkarılan)", "", "| Grup | Kart | Değer kaynağı | Metin düzeyi | Durum profili | Excel |", "|---|---|---|---|---|---|"]
    total = 0
    for g, fs in factors_by_group.items():
        for f in fs:
            total += 1
            vs = f["valueSource"]
            vsd = vs.get("path") or vs.get("kind")
            sr = f["sourceRef"]
            where = f"{sr['sheet']}!B{sr['titleRow']}" if sr.get("sheet") else "(taslak)"
            lines.append(f"| {g} | `{f['id']}` {f['title']} | {vsd} | {f['textLevel']} | {f['statusProfile']} | {where} ← {sr['library'].get('sheet','')}!{sr['library'].get('cell','')} |")
    lines += ["", f"Toplam kart: **{total}** (3: {len(factors_by_group['yol-cevre'])}, 4: {len(factors_by_group['arac'])}, 5: {len(factors_by_group['surucu'])}, 6: {len(factors_by_group['yolcu'])}, 9Y: {len(factors_by_group['yaya'])}).",
              f"Tanım kütüphanesinde numaralı başlık: **{len(heads)}**; rapor sayfalarında kullanılmayan ve taslak olarak taşınan: **{len(drafts)}**.", "",
              "## 6. Durum kural profilleri (V sütunu IF zincirlerinden)", ""]
    for p in profiles:
        lines.append(f"- **{p['id']}** (ilk görüldüğü yer `{p['firstSeen']}`, sayfalar {p['sheets']}): `{json.dumps(p['mapping'], ensure_ascii=False)}`, tanımsız → `{p['else']}`")
    lines += ["", f"## 7. Listeler: {len(lists)} ayrı kaynak aralığı", "", "| Liste | Kaynak | Öğe | Kullanım |", "|---|---|---|---|"]
    for l in lists.values():
        used = ", ".join(u["sheet"] + "!" + str(u["cells"]) for u in l["usedBy"][:4])
        lines.append(f"| `{l['id']}` | `{l['source']}` | {len(l['items'])} | {used} |")
    lines += ["", "## 8. Referans veri setleri", "", f"- il→ilçe: {ref_counts[0]} il; mahalle satırı: {ref_counts[1]}; il istatistik: {ref_counts[2]}; ilçe nüfus: {ref_counts[3]}; KGM kesim: {ref_counts[4]}",
              "", f"## 9. Altın beklentiler", "", f"- `tests/golden/expected.json`: {n_expected} formül hücresinin kayıtlı değeri.", "",
              "## 10. Sayfa 4 Araç 2 sütunu (AB:AX) referans analizi", "", "| Durum satırı | Araç 1 başlığı | Araç 2 başlık hücresi değeri | Araç 2 değer kaynağı |", "|---|---|---|---|"]
    for e in entity2_report[:50]:
        lines.append(f"| {e.get('statusRow')} | {e.get('title1','')} | {str(e.get('title2',''))[:40]} | `{json.dumps(e.get('valueSource2'), ensure_ascii=False)[:90]}` |")
    lines += ["", "## 11. Üretim notları", ""] + [f"- {n}" for n in REPORT["notes"]]
    path = os.path.join(ROOT, "docs/excel-analysis.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("  ✓ docs/excel-analysis.md")


def main():
    print("[1] Etken kartları")
    factors_by_group, profiles, used_rows, card_map, sample_entries, entity2_report = build_factors()
    existing_ids = [f["id"] for fs in factors_by_group.values() for f in fs]
    used_titles = {tr_upper(re.sub(r"\s+", " ", re.sub(r"^\s*[\d\.\s]+", "", f["title"]))).strip() for fs in factors_by_group.values() for f in fs}
    drafts, heads = build_draft_factors(used_rows, existing_ids, used_titles)
    for d in drafts:
        factors_by_group[d["group"]].append(d)
    order = ["yer-zaman", "yol-cevre", "arac", "dorse", "surucu", "yolcu", "yaya", "iz", "olu-yarali", "kaza-nedeni", "diger"]
    index = []
    for g in order:
        fs = factors_by_group.get(g, [])
        if not fs:
            continue
        out(f"content/core/factors/{g}.json", {"group": g, "version": CONTENT_VERSION, "factors": fs})
        index.append({"group": g, "file": f"{g}.json", "count": len(fs), "drafts": sum(1 for f in fs if f["draft"])})
    out("content/core/factors/index.json", {"version": CONTENT_VERSION, "groups": index,
                                            "groupTitles": {"yer-zaman": "1. Kazanın Yeri ve Zamanı", "yol-cevre": "2. Yol ve Çevre", "arac": "4. Araç", "dorse": "4.35 Dorse", "surucu": "5. Sürücü",
                                                            "yolcu": "8. Yolcu", "yaya": "9. Yaya", "iz": "6–7. İzler", "olu-yarali": "10. Ölü-Yaralıya Ait İzler", "kaza-nedeni": "11. Kaza Nedeni Mütalaası", "diger": "Diğer"}})
    out("content/core/rules/status-profiles.json", {"version": CONTENT_VERSION, "excelCompatible": True, "profiles": profiles,
                                                    "inputs": ["", "Yeterli", "Yetersiz", "Var", "Yok", "Yapıldı", "Aranmadı", "Belirsiz", "Davranış"],
                                                    "merged": {"id": "birlesik", "note": "Öneri: ürün sahibi onayı bekler (docs/acik-sorular.md)",
                                                               "mapping": {"": "", "Yeterli": "ETKEN DEĞİL", "Yetersiz": "İNCELENMELİ", "Aranmadı": "ETKEN DEĞİL", "Yok": "ETKEN", "Davranış": "İNCELENMELİ",
                                                                           "Var": "ETKEN DEĞİL", "Belirsiz": "İNCELENMELİ", "Yapıldı": "ETKEN DEĞİL"}, "else": ""}})
    print("[2] Listeler")
    lists, usage = build_lists()
    out("content/core/lists/index.json", {"version": CONTENT_VERSION, "lists": lists, "usage": usage})
    print("[3] Referans veriler")
    ref_counts = build_reference()
    print("[4] Bilgi bankası / meta / hukuki metin / delil kodları / sabitler / renkler")
    build_knowledge()
    print("[5] Excel haritası, örnek dosya, altın beklentiler")
    out("content/core/excel-map.json", {"version": CONTENT_VERSION, "giris": GIRIS_CELLS, "grs1": {str(k): {"path": v[0], "kind": v[1]} for k, v in GRS1_ROWS.items()}, "cards": card_map,
                                        "entityColumns": {"D": 0, "E": 1, "F": 2}, "sheet4EntityOffset": 26})
    build_sample_case(sample_entries)
    n_expected = build_expected()
    print("[6] Güneş modülü içeriği")
    build_gunes_content()
    print("[7] Logolar")
    os.makedirs(os.path.join(ROOT, "public/brand"), exist_ok=True)
    for src, dst in (("image1.png", "sb-bilirkisilik-adaletin-guvencesi.png"), ("image2.png", "tubir.png"), ("image3.png", "sb-bilirkisilik.png")):
        shutil.copy(os.path.join(ROOT, "scripts/extract/out/core/media", src), os.path.join(ROOT, "public/brand", dst))
    print("[8] Doküman")
    write_analysis_doc(factors_by_group, drafts, heads, profiles, lists, ref_counts, n_expected, entity2_report)
    out("scripts/extract/out/build-report.json", REPORT)
    print("Bitti.")


if __name__ == "__main__":
    main()
