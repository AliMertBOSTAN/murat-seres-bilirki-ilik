"""Rapor sayfalarındaki (3, 4, 5, 6, 9Y) etken kartı bloklarını formül düzeyinde çözümler."""
import json
import re
from openpyxl.utils import column_index_from_string as col_idx, get_column_letter as col_letter

from .formula import parse, flatten_if, eq_literal, Ref, Func, Str, Num, Err, Empty, BinOp, to_text, refs as all_refs
from .paths import grs1_path

GROUP_BY_SHEET = {"3": "yol-cevre", "4": "arac", "5": "surucu", "6": "yolcu", "9Y": "yaya"}
PER_ENTITY = {"4": "arac", "5": "surucu", "6": "yolcu", "9Y": "yaya"}
LIBRARY_SHEETS = {"Tanım", "BİLGİ HESAP"}
STATUS_INPUTS = {"": "", "YETERLİ": "Yeterli", "YETERSİZ": "Yetersiz", "ARANMADI": "Aranmadı", "YOK": "Yok",
                 "DAVRANIŞ": "Davranış", "VAR": "Var", "BELİRSİZ": "Belirsiz", "YAPILDI": "Yapıldı"}
TR_UP = str.maketrans("abcçdefgğhıijklmnoöprsştuüvyzwxq", "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZWXQ")


def tr_upper(s: str) -> str:
    return s.translate(TR_UP)


def slugify(s: str) -> str:
    s = re.sub(r"^\s*[\d\.\s]+", "", s)  # numarayı at
    tr = str.maketrans("çğıöşüÇĞİÖŞÜI", "cgiosuCGIOSUI")
    s = s.translate(tr).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "etken"


def display_code(title: str):
    m = re.match(r"^\s*(\d+(?:[\.,]\d+)*\.?)", title)
    return m.group(1).rstrip(".") + "." if m else ""


def shift(col: str, offset: int) -> str:
    return col_letter(col_idx(col) + offset)


class CardParser:
    def __init__(self, book, sheet_name, col_offset=0):
        self.book = book
        self.sheet_name = sheet_name
        self.sh = book[sheet_name]
        self.off = col_offset
        self.warnings = []

    # ---- yardımcılar -------------------------------------------------
    def c(self, col, row):
        return f"{shift(col, self.off)}{row}"

    def val(self, col, row):
        return self.sh.val(self.c(col, row))

    def formula(self, col, row):
        return self.sh.formula(self.c(col, row))

    def lib_text(self, ref: Ref):
        sheet = ref.sheet or self.sheet_name
        try:
            return self.book.text(sheet, ref.start)
        except KeyError:
            return ""

    def resolve_ref(self, ref: Ref, ctx):
        """Bir referansın anlamını belirler."""
        sheet = ref.sheet or self.sheet_name
        if ref.external:
            return {"kind": "external", "ref": str(ref)}
        if ref.start.startswith("#"):
            return {"kind": "error", "ref": str(ref)}
        if sheet in LIBRARY_SHEETS:
            return {"kind": "library", "sheet": sheet, "cell": ref.a1(), "text": self.lib_text(ref)}
        if sheet == "Grş 1":
            col, row = re.match(r"([A-Z]+)(\d+)", ref.start).groups()
            p = grs1_path(col, int(row))
            if p:
                return {"kind": "input", "path": p[0], "entityKind": p[1], "entityIndex": p[2], "cell": f"'Grş 1'!{ref.start}"}
            return {"kind": "input-unmapped", "cell": f"'Grş 1'!{ref.start}", "value": self.book.val("Grş 1", ref.start) if re.match(r"^[A-Z]{1,2}\d+$", ref.start) else None}
        if sheet == self.sheet_name:
            if ref.a1() == ctx["valueCell"]:
                return {"kind": "card", "field": "value"}
            if ref.a1() == ctx["statusCell"]:
                return {"kind": "card", "field": "incelemeDurumu"}
            if ref.a1() == ctx["resultCell"]:
                return {"kind": "card", "field": "durum"}
            if ref.a1() == ctx["subTitleCell"]:
                return {"kind": "card", "field": "subTitle", "text": self.sh.text(ref.a1())}
            v = self.sh.val(ref.start)
            f = self.sh.formula(ref.start)
            if v in (None, "", " ", 0) and not f:
                return {"kind": "blank", "cell": ref.a1()}
            # başka bir kart hücresi (ör. B22 etiketi) → statik metin
            if f and f.startswith("=") and "Tanım" in f:
                return {"kind": "library-via-card", "cell": ref.a1(), "text": self.sh.text(ref.start), "formula": f}
            return {"kind": "sheet-cell", "cell": ref.a1(), "text": self.sh.text(ref.start)}
        return {"kind": "other-sheet", "sheet": sheet, "cell": ref.a1(), "text": self.book.text(sheet, ref.start) if sheet in self.book.sheets else ""}

    def node_to_parts(self, node, ctx):
        """CONCATENATE/& ağacını metin parçalarına çevirir."""
        if isinstance(node, Func) and node.name == "CONCATENATE":
            parts = []
            for a in node.args:
                parts.extend(self.node_to_parts(a, ctx))
            return parts
        if isinstance(node, BinOp) and node.op == "&":
            return self.node_to_parts(node.left, ctx) + self.node_to_parts(node.right, ctx)
        if isinstance(node, Func) and node.name == "HOUR":
            inner = self.node_to_parts(node.args[0], ctx)
            return [{"kind": "hourOf", "of": inner}]
        if isinstance(node, Str):
            return [{"kind": "literal", "text": node.value}]
        if isinstance(node, Num):
            return [{"kind": "literal", "text": str(node.value)}]
        if isinstance(node, Err):
            return [{"kind": "error", "value": node.value}]
        if isinstance(node, Empty):
            return []
        if isinstance(node, Ref):
            r = self.resolve_ref(node, ctx)
            if r["kind"] == "library":
                return [{"kind": "text", "text": r["text"], "source": f"{r['sheet']}!{r['cell']}"}]
            if r["kind"] in ("card",):
                return [{"kind": r["field"], **({"text": r.get("text")} if r.get("text") else {})}]
            if r["kind"] == "input":
                return [{"kind": "value", "path": r["path"], "source": r["cell"]}]
            if r["kind"] == "blank":
                return [{"kind": "blank", "cell": r["cell"]}]
            return [{"kind": r["kind"], **{k: v for k, v in r.items() if k != "kind"}}]
        return [{"kind": "unsupported", "formula": to_text(node)}]

    def text_source(self, node, ctx):
        """Açıklama/Nedensellik/Sorun hücresindeki formülün anlamı."""
        if isinstance(node, Func) and node.name == "IF":
            branches, els = flatten_if(node)
            # IF(X="", "", <inner>) kalıbı → inner
            if len(branches) == 1 and isinstance(branches[0][1], Str) and branches[0][1].value == "":
                return self.text_source(els, ctx)
            # IF(V="İNCELENMELİ", J, IF(V="ETKEN", J, ... I)) kalıbı → duruma bağlı metin
            conds = []
            cond_kind = None
            for cond, val in branches:
                lit = eq_literal(cond)
                if not lit:
                    return {"kind": "formula", "formula": to_text(node)}
                ref, value = lit
                res = self.resolve_ref(ref, ctx)
                cond_kind = res.get("field") or res.get("kind")
                conds.append({"when": value, "then": self.text_source(val, ctx)})
            return {"kind": "conditional", "on": cond_kind, "branches": conds, "else": self.text_source(els, ctx)}
        if isinstance(node, Func) and node.name == "VLOOKUP":
            key, rng, col = node.args[0], node.args[1], node.args[2]
            exact = not (len(node.args) > 3 and isinstance(node.args[3], Num) and node.args[3].value == 1)
            if not isinstance(rng, Ref) or not isinstance(col, Num):
                return {"kind": "formula", "formula": to_text(node)}
            key_res = self.resolve_ref(key, ctx) if isinstance(key, Ref) else {"kind": "literal", "text": getattr(key, "value", "")}
            table = self.lookup_table(rng, int(col.value))
            if key_res["kind"] in ("card", "input") and key_res.get("field") != "subTitle":
                return {"kind": "option", "keyFrom": key_res, "table": table, "range": str(rng), "column": int(col.value), "exact": exact}
            # statik anahtar → şimdi çöz
            key_text = key_res.get("text") or (self.book.val("Grş 1", key.start) if key_res["kind"] == "input-unmapped" else "")
            text = self.static_lookup(table, key_text or "")
            return {"kind": "text", "text": text, "source": f"VLOOKUP({key_text!r},{rng},{int(col.value)})", "table": table}
        if isinstance(node, Ref):
            r = self.resolve_ref(node, ctx)
            if r["kind"] in ("library", "library-via-card", "sheet-cell", "other-sheet"):
                return {"kind": "text", "text": r.get("text", ""), "source": f"{r.get('sheet', self.sheet_name)}!{r['cell']}"}
            if r["kind"] == "card":
                return {"kind": r["field"]}
            return r
        if isinstance(node, (Str, Num)):
            return {"kind": "literal", "text": str(node.value)}
        if isinstance(node, Empty):
            return {"kind": "empty"}
        if isinstance(node, Func) and node.name == "CONCATENATE" or isinstance(node, BinOp):
            return {"kind": "parts", "parts": self.node_to_parts(node, ctx)}
        return {"kind": "formula", "formula": to_text(node)}

    def lookup_table(self, rng: Ref, col: int):
        sheet = rng.sheet or self.sheet_name
        sh = self.book[sheet]
        rows = sh.range_rows(f"{rng.start}:{rng.end}")
        first_col = re.match(r"[A-Z]+", rng.start).group(0)
        target_col = col_letter(col_idx(first_col) + col - 1)
        out = []
        for r, rowd in rows:
            key = rowd.get(first_col)
            if key is None or key == "" or key == 0:
                continue
            out.append({"key": str(key), "text": "" if rowd.get(target_col) in (None, 0) else str(rowd.get(target_col)), "row": r})
        return out

    @staticmethod
    def static_lookup(table, key_text):
        k = tr_upper(str(key_text).strip())
        for row in table:
            if tr_upper(row["key"].strip()) == k:
                return row["text"]
        return ""

    # ---- kart --------------------------------------------------------
    def find_status_rows(self):
        rows = set()
        for a1, c in self.sh.cells.items():
            m = re.match(r"([A-Z]+)(\d+)$", a1)
            if m.group(1) != shift("B", self.off):
                continue
            v = c.get("cached") if "f" in c else c.get("v")
            if c.get("f") in ("=Tanım!$B$41", "=Tanım!B41") or (isinstance(v, str) and v.strip() == "İnceleme Durumu"):
                rows.add(int(m.group(2)))
        return sorted(rows)

    def parse_card(self, sr):
        tr_, vr = sr - 2, sr - 1
        ctx = {"valueCell": self.c("E", vr), "statusCell": self.c("E", sr), "resultCell": self.c("V", sr), "subTitleCell": self.c("B", vr)}
        card = {"sheet": self.sheet_name, "titleRow": tr_, "statusRow": sr, "colOffset": self.off, "warnings": []}

        # Başlık
        tf = self.formula("B", tr_)
        title_text = self.sh.text(self.c("B", tr_))
        lib_row = None
        if tf:
            node = parse(tf)
            if isinstance(node, Ref) and (node.sheet in LIBRARY_SHEETS):
                lib_row = {"sheet": node.sheet, "cell": node.a1()}
                title_text = title_text or self.lib_text(node)
        card["title"] = title_text.strip()
        card["titleSource"] = lib_row or {"literal": True}
        # Kütüphane başlık satırının tüm hücreleri (eksiksiz taşıma)
        if lib_row:
            r = int(re.search(r"\d+", lib_row["cell"]).group(0))
            card["libraryRows"] = self.library_block(lib_row["sheet"], r)

        # Ek dosya bayrağı
        ef = self.formula("V", tr_)
        card["ekDosya"] = self.parse_ekdosya(ef, ctx) if ef else {"kind": "manual", "value": self.val("V", tr_)}

        # Değer satırı
        card["subTitle"] = self.sh.text(self.c("B", vr)).strip()
        vf = self.formula("E", vr)
        if vf:
            node = parse(vf)
            if isinstance(node, Ref):
                r = self.resolve_ref(node, ctx)
                card["valueSource"] = r
            else:
                card["valueSource"] = {"kind": "formula", "formula": to_text(node)}
        else:
            card["valueSource"] = {"kind": "cardSelect"}
        card["sampleValue"] = self.val("E", vr)
        # H değer satırı: aranan metni veya "X Durumu"
        hf = self.formula("H", vr)
        if hf:
            n = parse(hf)
            if isinstance(n, Ref):
                r = self.resolve_ref(n, ctx)
                if r["kind"] == "library":
                    card["aranan"] = r["text"]
                    card["arananSource"] = f"{r['sheet']}!{r['cell']}"
            elif isinstance(n, Str):
                card["degerDurumBasligi"] = n.value
            else:
                card["degerDurumParts"] = self.node_to_parts(n, ctx)
        for col in ("I", "M"):
            f2 = self.formula(col, vr)
            if f2 and "degerDurumParts" not in card:
                card["degerDurumParts"] = self.node_to_parts(parse(f2), ctx)
        s_val = self.val("S", vr)
        if s_val not in (None, ""):
            card["sampleScale"] = s_val  # Çok İyi … Çok Kötü skalası

        # İnceleme durumu satırı
        card["sampleIncelemeDurumu"] = self.val("E", sr)
        kf = self.formula("H", sr)
        card["kazadaDurumu"] = self.parse_kazada(kf, ctx) if kf else {"kind": "none"}
        sf = self.formula("V", sr)
        card["statusRule"] = self.parse_status(sf, ctx) if sf else {"kind": "none"}

        # Sonraki satırlar
        rows = []
        r = sr + 1
        while r <= sr + 12:
            label = self.sh.text(self.c("B", r)).strip()
            lf = self.formula("B", r)
            if not label and not lf and not self.formula("E", r) and self.val("E", r) is None:
                r += 1
                if r > sr + 12:
                    break
                # boş satır kart sonu olabilir; ama devam et
                continue
            if lf and lf.replace("$", "") in ("=Tanım!B41",):
                break  # yeni kart
            if label == "İnceleme Durumu":
                break
            row = {"row": r, "label": label}
            ef_ = self.formula("E", r)
            if label in ("Tespit Yöntemi",):
                row["tespit"] = {
                    "yontemler": [self.val(c_, r) for c_ in ("E", "H", "K")],
                    "delilKodu": self.val("P", r), "puanlar": [self.val(c_, r) for c_ in ("Q", "R", "S", "T")],
                    "dogrulama": self.val("X", r), "labels": {"N": self.val("N", r), "U": self.val("U", r)},
                }
            elif label in ("Sorumlu Tespiti",):
                row["sorumlu"] = {"sorumlu": self.val("E", r), "hakimSavciLabel": self.val("P", r), "hakimSavci": self.val("S", r)}
                rows.append(row)
                break
            elif ef_:
                row["source"] = self.text_source(parse(ef_), ctx)
                row["sampleText"] = self.val("E", r)
            else:
                row["sampleValue"] = self.val("E", r)
            rows.append(row)
            r += 1
        card["rows"] = rows
        return card

    def library_block(self, sheet, row):
        """Kütüphane başlık satırından bir sonraki numaralı başlığa kadar tüm dolu hücreler."""
        sh = self.book[sheet]
        out = []
        r = row
        while r < row + 40:
            cells = {col: (c.get("cached") if "f" in c else c.get("v")) for col, c in sh.row_cells(r).items()}
            cells = {k: v for k, v in cells.items() if v not in (None, "", 0)}
            if r > row:
                b = cells.get("B")
                if isinstance(b, str) and re.match(r"^\s*\d+(\.\d+)+\.?\s*[A-Za-zÇĞİÖŞÜçğıöşü]", b):
                    break
            if cells:
                out.append({"row": r, "cells": cells})
            r += 1
        return out

    def parse_ekdosya(self, f, ctx):
        node = parse(f)
        branches, els = flatten_if(node)
        hide_when = []
        for cond, val in branches:
            lit = eq_literal(cond)
            if lit and isinstance(val, Str) and val.value == "":
                hide_when.append(lit[1])
            else:
                self.warnings.append(f"ekDosya beklenmeyen dal: {to_text(node)}")
        parts = self.node_to_parts(els, ctx)
        texts = [p for p in parts if p["kind"] == "text"]
        return {"kind": "rule", "hideWhen": hide_when, "parts": parts,
                "kod": texts[0]["text"] if texts else "", "metin": texts[1]["text"] if len(texts) > 1 else "",
                "formula": to_text(node)}

    def parse_kazada(self, f, ctx):
        node = parse(f)
        branches, els = flatten_if(node)
        out = {"kind": "rule", "branches": [], "formula": to_text(node)}
        for cond, val in branches:
            lit = eq_literal(cond)
            if not lit:
                out["branches"].append({"when": "?", "parts": [{"kind": "unsupported", "formula": to_text(cond)}]})
                continue
            ref, value = lit
            res = self.resolve_ref(ref, ctx)
            out["branches"].append({"when": value, "on": res.get("field") or res.get("kind"), "onCell": str(ref), "parts": self.node_to_parts(val, ctx)})
        out["else"] = self.node_to_parts(els, ctx)
        return out

    def parse_status(self, f, ctx):
        node = parse(f)
        branches, els = flatten_if(node)
        mapping = {}
        raw = {}
        for cond, val in branches:
            lit = eq_literal(cond)
            if not lit:
                self.warnings.append(f"durum kuralı beklenmeyen koşul: {to_text(cond)}")
                continue
            key = tr_upper(str(lit[1]).strip())
            canon = STATUS_INPUTS.get(key, str(lit[1]))
            result = val.value if isinstance(val, Str) else ("FALSE" if isinstance(val, Empty) else to_text(val))
            mapping[canon] = result
            raw[str(lit[1])] = result
        else_val = els.value if isinstance(els, Str) else ("FALSE" if isinstance(els, Empty) else to_text(els))
        return {"kind": "table", "mapping": mapping, "rawKeys": raw, "else": else_val, "formula": to_text(node)}


def profile_signature(status_rule):
    m = status_rule.get("mapping", {})
    return json.dumps({k: m[k] for k in sorted(m)}, ensure_ascii=False) + "|" + str(status_rule.get("else"))
