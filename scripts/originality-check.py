"""Copy originality check: compares every prose sentence in content/projects.ts with Ehjay Lorenzo's case-study
text (read-only, in his portfolio folder) and prints the closest matches. The brief asks for Nico's own wording.

Usage: python scripts/originality-check.py [threshold=0.5]    (EHJAY_PORTFOLIO overrides the folder)
Target: no sentence at 0.6 or above, except quoted on-screen text and proper-noun lists.
"""
import os
import re, glob, sys
from difflib import SequenceMatcher

A = os.environ.get("EHJAY_PORTFOLIO", os.path.join("C:" + os.sep, "Users", "Client", "LPT", "assets"))
NEW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "projects.ts")
BS = chr(92)

def split_sents(t):
    t = re.sub(r"\s+", " ", t)
    parts = re.split(r"(?<=[.!?:;])\s+|\s+[—–]\s+", t)
    return [p.strip(" -*#>\"'`") for p in parts if len(p.strip()) >= 20]

LIT = r'"((?:[^"' + BS + BS + r'\n]|' + BS + BS + r'.)*)"|`((?:[^`' + BS + BS + r']|' + BS + BS + r'.)*)`'

def str_literals(src):
    out = []
    for m in re.finditer(LIT, src):
        s = m.group(1) if m.group(1) is not None else m.group(2)
        if " " in s and not s.startswith("/") and "http" not in s:
            out.append(s)
    return out

old = []
for f in glob.glob(A + r"\content\work\*.mdx"):
    txt = open(f, encoding="utf-8").read()
    txt = re.sub(r"<[^>]+>", " ", txt)
    for line in txt.split("\n"):
        old += split_sents(line)
for s in str_literals(open(A + r"\content\data\projects.ts", encoding="utf-8").read()):
    old += split_sents(s)
old_l = list({o.lower() for o in old})

src = open(NEW, encoding="utf-8").read()
PROSE = {"summary", "lede", "problem", "body", "bullets", "reading", "disclosures", "description", "caption", "alt", "heading"}
new = []
cur_arr = None
tok = r"(\w+):\s*\[|\]|(\w+):\s*(?:" + LIT + ")|" + LIT
for m in re.finditer(tok, src):
    if m.group(1):
        cur_arr = m.group(1)
        continue
    if m.group(0) == "]":
        cur_arr = None
        continue
    key = m.group(2)
    if key is None:
        val = m.group(5) if m.group(5) is not None else m.group(6)
        if cur_arr in PROSE and val:
            new += split_sents(val)
        continue
    val = m.group(3) if m.group(3) is not None else m.group(4)
    ls = src.rfind("\n", 0, m.start())
    le = src.find("\n", m.start())
    line = src[ls:le]
    if key in PROSE or (key == "title" and "/demos/" in line):
        new += split_sents(val)

res = []
for n in new:
    nl = n.lower()
    best, bo = 0.0, ""
    for o in old_l:
        sm = SequenceMatcher(None, nl, o)
        if sm.real_quick_ratio() <= best or sm.quick_ratio() <= best:
            continue
        r = sm.ratio()
        if r > best:
            best, bo = r, o
    res.append((best, n, bo))
res.sort(reverse=True)
thr = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
for b, n, o in res:
    if b >= thr:
        print(f"{b:.2f} | {n}\n     ~ {o}")
print("sentences:", len(res), "max:", f"{res[0][0]:.3f}", ">=0.6:", sum(r[0] >= 0.6 for r in res), ">0.5:", sum(r[0] > 0.5 for r in res))
