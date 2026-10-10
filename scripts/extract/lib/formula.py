"""Küçük bir Excel formül ayrıştırıcısı (tokenizer + AST).

Yalnızca çıkarım için kullanılır: IF zincirleri, VLOOKUP aralıkları, CONCATENATE parçaları ve
hücre referansları yapısal olarak okunur. Hesaplama yapılmaz (hesap motoru TypeScript'te).
"""
import re
from dataclasses import dataclass, field
from typing import List, Optional, Union

TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<str>"(?:[^"]|"")*")
  | (?P<err>\#(?:REF!|NAME\?|VALUE!|DIV/0!|N/A|NUM!|NULL!))
  | (?P<ref>(?:\[\d+\])?(?:'(?:[^']|'')+'|[A-Za-z0-9_\.ÇĞİÖŞÜçğıöşü]+)!(?:\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?|\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\$?\d+:\$?\d+|\#REF!))
  | (?P<lref>\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?(?![A-Za-z\(])|\$?[A-Z]{1,3}:\$?[A-Z]{1,3})
  | (?P<num>\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)
  | (?P<func>[A-Za-z_][A-Za-z0-9_\.]*\s*\()
  | (?P<bool>TRUE|FALSE)
  | (?P<op><>|<=|>=|[+\-*/^&=<>])
  | (?P<lp>\()
  | (?P<rp>\))
  | (?P<comma>[,;])
""", re.X)


@dataclass
class Num:  value: float
@dataclass
class Str:  value: str
@dataclass
class Bool: value: bool
@dataclass
class Err:  value: str
@dataclass
class Ref:
    sheet: Optional[str]
    start: str
    end: Optional[str] = None
    external: Optional[str] = None
    def a1(self) -> str:
        return self.start + (":" + self.end if self.end else "")
    def __str__(self):
        s = (f"'{self.sheet}'!" if self.sheet else "")
        return (f"[{self.external}]" if self.external else "") + s + self.a1()
@dataclass
class Func:
    name: str
    args: List["Node"] = field(default_factory=list)
@dataclass
class BinOp:
    op: str
    left: "Node"
    right: "Node"
@dataclass
class Neg:  value: "Node"
@dataclass
class Empty: pass

Node = Union[Num, Str, Bool, Err, Ref, Func, BinOp, Neg, Empty]


def tokenize(src: str):
    pos = 0
    out = []
    while pos < len(src):
        m = TOKEN_RE.match(src, pos)
        if not m:
            raise ValueError(f"Tokenize hatası @{pos}: {src[pos:pos+30]!r} in {src!r}")
        pos = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        out.append((kind, m.group(kind)))
    return out


def strip_dollar(a1: str) -> str:
    return a1.replace("$", "")


def parse_ref(text: str) -> Ref:
    external = None
    m = re.match(r"^\[(\d+)\](.*)$", text)
    if m:
        external, text = m.group(1), m.group(2)
    sheet = None
    if "!" in text:
        sheet, rng = text.rsplit("!", 1)
        if sheet.startswith("'"):
            sheet = sheet[1:-1].replace("''", "'")
    else:
        rng = text
    if ":" in rng and not rng.startswith("#"):
        a, b = rng.split(":")
        return Ref(sheet, strip_dollar(a), strip_dollar(b), external)
    return Ref(sheet, strip_dollar(rng), None, external)


class Parser:
    def __init__(self, tokens):
        self.toks = tokens
        self.i = 0

    def peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else (None, None)

    def take(self, kind=None):
        tok = self.peek()
        if kind and tok[0] != kind:
            raise ValueError(f"Beklenen {kind}, bulunan {tok}")
        self.i += 1
        return tok

    # precedence: comparison < & < +- < */ < ^ < unary
    def expr(self):
        return self.comparison()

    def comparison(self):
        left = self.concat()
        while self.peek()[0] == "op" and self.peek()[1] in ("=", "<>", "<", ">", "<=", ">="):
            op = self.take()[1]
            left = BinOp(op, left, self.concat())
        return left

    def concat(self):
        left = self.additive()
        while self.peek()[0] == "op" and self.peek()[1] == "&":
            self.take()
            left = BinOp("&", left, self.additive())
        return left

    def additive(self):
        left = self.multiplicative()
        while self.peek()[0] == "op" and self.peek()[1] in ("+", "-"):
            op = self.take()[1]
            left = BinOp(op, left, self.multiplicative())
        return left

    def multiplicative(self):
        left = self.power()
        while self.peek()[0] == "op" and self.peek()[1] in ("*", "/"):
            op = self.take()[1]
            left = BinOp(op, left, self.power())
        return left

    def power(self):
        left = self.unary()
        while self.peek()[0] == "op" and self.peek()[1] == "^":
            self.take()
            left = BinOp("^", left, self.unary())
        return left

    def unary(self):
        if self.peek()[0] == "op" and self.peek()[1] == "-":
            self.take()
            return Neg(self.unary())
        if self.peek()[0] == "op" and self.peek()[1] == "+":
            self.take()
            return self.unary()
        return self.primary()

    def primary(self):
        kind, text = self.peek()
        if kind == "num":
            self.take(); return Num(float(text))
        if kind == "str":
            self.take(); return Str(text[1:-1].replace('""', '"'))
        if kind == "bool":
            self.take(); return Bool(text == "TRUE")
        if kind == "err":
            self.take(); return Err(text)
        if kind in ("ref", "lref"):
            self.take(); return parse_ref(text)
        if kind == "func":
            self.take()
            name = text[:-1].strip().upper()
            name = re.sub(r"^_XLFN\.(_XLWS\.)?", "", name)
            args = []
            if self.peek()[0] == "rp":
                self.take(); return Func(name, args)
            while True:
                if self.peek()[0] in ("comma",):
                    args.append(Empty()); self.take(); continue
                if self.peek()[0] == "rp":
                    args.append(Empty()); self.take(); break
                args.append(self.expr())
                k = self.peek()[0]
                if k == "comma":
                    self.take()
                    if self.peek()[0] == "rp":
                        args.append(Empty()); self.take(); break
                    continue
                if k == "rp":
                    self.take(); break
                raise ValueError(f"Fonksiyon argümanı beklenirken {self.peek()}")
            return Func(name, args)
        if kind == "lp":
            self.take()
            e = self.expr()
            self.take("rp")
            return e
        raise ValueError(f"Beklenmeyen token {kind} {text!r}")


def parse(formula: str) -> Node:
    src = formula[1:] if formula.startswith("=") else formula
    p = Parser(tokenize(src))
    node = p.expr()
    if p.i != len(p.toks):
        raise ValueError(f"Artık token: {p.toks[p.i:]} in {formula!r}")
    return node


def walk(node):
    yield node
    if isinstance(node, Func):
        for a in node.args:
            yield from walk(a)
    elif isinstance(node, BinOp):
        yield from walk(node.left); yield from walk(node.right)
    elif isinstance(node, Neg):
        yield from walk(node.value)


def refs(node):
    return [n for n in walk(node) if isinstance(n, Ref)]


def flatten_if(node):
    """IF(c1,v1,IF(c2,v2,...,else)) → ([(cond, val), ...], else)."""
    branches = []
    cur = node
    while isinstance(cur, Func) and cur.name == "IF":
        cond = cur.args[0]
        val = cur.args[1] if len(cur.args) > 1 else Empty()
        branches.append((cond, val))
        cur = cur.args[2] if len(cur.args) > 2 else Empty()
    return branches, cur


def eq_literal(cond):
    """`X = "lit"` biçimindeki koşuldan (ref, lit) döndürür; değilse None."""
    if isinstance(cond, BinOp) and cond.op == "=":
        l, r = cond.left, cond.right
        if isinstance(l, Ref) and isinstance(r, (Str, Num)):
            return l, (r.value if isinstance(r, Str) else r.value)
        if isinstance(r, Ref) and isinstance(l, (Str, Num)):
            return r, (l.value if isinstance(l, Str) else l.value)
    return None


def to_text(node) -> str:
    """AST'yi okunur formül metnine çevirir (dokümantasyon/izlenebilirlik için)."""
    if isinstance(node, Num):
        return str(int(node.value)) if node.value == int(node.value) else repr(node.value)
    if isinstance(node, Str):
        return '"' + node.value.replace('"', '""') + '"'
    if isinstance(node, Bool):
        return "TRUE" if node.value else "FALSE"
    if isinstance(node, Err):
        return node.value
    if isinstance(node, Ref):
        return str(node)
    if isinstance(node, Empty):
        return ""
    if isinstance(node, Neg):
        return "-" + to_text(node.value)
    if isinstance(node, BinOp):
        return f"{to_text(node.left)}{node.op}{to_text(node.right)}"
    if isinstance(node, Func):
        return f"{node.name}({','.join(to_text(a) for a in node.args)})"
    return "?"
