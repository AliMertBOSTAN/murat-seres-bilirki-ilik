"""Çıkarılmış JSON sayfalarını yükleyen ve hücre/aralık okumayı kolaylaştıran yardımcı."""
import glob
import json
import os
import re
from openpyxl.utils import column_index_from_string as col_idx, get_column_letter as col_letter

A1_RE = re.compile(r"^([A-Z]{1,3})(\d+)$")


def split_a1(a1: str):
    m = A1_RE.match(a1)
    if not m:
        raise ValueError(a1)
    return m.group(1), int(m.group(2))


class Sheet:
    def __init__(self, data):
        self.data = data
        self.name = data["name"]
        self.cells = data["cells"]
        self._rows = None

    def _row_index(self):
        if self._rows is None:
            idx = {}
            for a1, c in self.cells.items():
                col, r = split_a1(a1)
                idx.setdefault(r, {})[col] = c
            self._rows = idx
        return self._rows

    def raw(self, a1):
        return self.cells.get(a1)

    def val(self, a1):
        c = self.cells.get(a1)
        if not c:
            return None
        return c.get("cached") if "f" in c else c.get("v")

    def formula(self, a1):
        c = self.cells.get(a1)
        return c.get("f") if c else None

    def text(self, a1):
        v = self.val(a1)
        if v is None or v == 0 or v is False:
            return ""
        return str(v)

    def row_cells(self, row):
        out = self._row_index().get(row, {})
        return dict(sorted(out.items(), key=lambda kv: col_idx(kv[0])))

    def rows_with_prefix(self, col, pattern):
        rx = re.compile(pattern)
        res = []
        for a1 in self.cells:
            c, r = split_a1(a1)
            if c == col:
                v = self.val(a1)
                if isinstance(v, str) and rx.search(v):
                    res.append(r)
        return sorted(res)

    def range_rows(self, rng):
        """'B378:H384' → [(row, {col: value})] yalnızca dolu hücreler."""
        a, b = rng.split(":")
        c0, r0 = split_a1(a)
        c1, r1 = split_a1(b)
        ci0, ci1 = col_idx(c0), col_idx(c1)
        out = []
        for r in range(r0, r1 + 1):
            rowd = {}
            for ci in range(ci0, ci1 + 1):
                a1 = f"{col_letter(ci)}{r}"
                v = self.val(a1)
                if v is not None:
                    rowd[col_letter(ci)] = v
            out.append((r, rowd))
        return out

    def column_values(self, rng):
        """'B395:B408' → [değerler] (boş olmayan)."""
        a, b = rng.split(":")
        c0, r0 = split_a1(a)
        _, r1 = split_a1(b)
        vals = []
        for r in range(r0, r1 + 1):
            v = self.val(f"{c0}{r}")
            if v is not None and v != 0 and v != "":
                vals.append(v)
        return vals

    def row_values(self, rng):
        """'C271:Q271' → [değerler] yatay liste."""
        a, b = rng.split(":")
        c0, r0 = split_a1(a)
        c1, _ = split_a1(b)
        vals = []
        for ci in range(col_idx(c0), col_idx(c1) + 1):
            v = self.val(f"{col_letter(ci)}{r0}")
            if v is not None and v != 0 and v != "":
                vals.append(v)
        return vals

    def max_row(self):
        return self.data.get("maxRow", 0)


class Book:
    def __init__(self, out_dir):
        self.out_dir = out_dir
        self.workbook = json.load(open(os.path.join(out_dir, "_workbook.json"), encoding="utf-8"))
        self.sheets = {}
        for f in sorted(glob.glob(os.path.join(out_dir, "sheets", "*.json"))):
            d = json.load(open(f, encoding="utf-8"))
            self.sheets[d["name"]] = Sheet(d)

    def __getitem__(self, name) -> Sheet:
        return self.sheets[name]

    def val(self, sheet, a1):
        return self.sheets[sheet].val(a1)

    def text(self, sheet, a1):
        return self.sheets[sheet].text(a1)

    def list_from_ref(self, ref_text):
        """'Tanım!$B$395:$B$408' veya "'BİLGİ HESAP'!$D$513:$X$513" → (sheet, range, [values])"""
        sheet, rng = ref_text.rsplit("!", 1)
        sheet = sheet.strip("'")
        rng = rng.replace("$", "")
        if ":" not in rng:
            rng = rng + ":" + rng
        a, b = rng.split(":")
        ca, ra = split_a1(a)
        cb, rb = split_a1(b)
        sh = self.sheets[sheet]
        if ca == cb:
            vals = sh.column_values(rng)
        elif ra == rb:
            vals = sh.row_values(rng)
        else:
            vals = [v for _, rowd in sh.range_rows(rng) for v in rowd.values()]
        return sheet, rng, vals
