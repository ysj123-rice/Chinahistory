#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
姓氏源流 · 三源统一抓取管线
====================================
把三个数据源抓到的碎片合并成一行记录, 字段严格对齐:
    surname / origin_era / origin_place / derive_type / origin_story / junwang

数据源:
  [wiki]    中文维基百科  MediaWiki API —— 结构化 infobox(郡望/堂号/起源), 批量 50 条/次, 无 key 无配额
            (可选 --wikidata 走 Wikidata SPARQL 补充别名/描述)
  [shlib]   上海图书馆家谱开放数据 —— 姓氏规范库(600余姓) + 家谱书目(谱籍地/堂号), 需 APIKey
  [tianapi] 天聚数行 姓氏起源 —— 起源长文(含郡望/始祖/堂号), 需 APIKey, 免费 100 次/天

合并策略: 字段级优先级, 每个字段独立选最优来源, 并记录该字段来自哪个源 + 置信度。
跑完自动产出「待人工复核队列」(缺失或低置信的行), 供你补 derive_type / origin_place。

用法:
    export SHLIB_KEY="..."      # 可选, 不用 shlib 源可不设
    export TIANAPI_KEY="..."    # 可选

    python3 surname_pipeline.py selftest                      # 离线自检, 验证解析逻辑
    python3 surname_pipeline.py probe 王 --source wiki         # 单姓单源, 看原始返回
    python3 surname_pipeline.py show-enum                      # 打印默认得姓方式枚举
    python3 surname_pipeline.py run --limit 100                # 全源跑前 100 姓
    python3 surname_pipeline.py run --sources wiki --limit 300 # 只跑维基
    python3 surname_pipeline.py run --surnames 王,李,欧阳
    python3 surname_pipeline.py run --enum-file my_enum.json   # 换成你自己的枚举

输出:
    pipeline_out/dataset.csv      最终数据集(含字段来源列)
    pipeline_out/dataset.xlsx     同上, 带字段说明页
    pipeline_out/review_queue.csv 待人工复核(1 不看就能用, 0 必须人工过)
"""

import argparse
import csv
import json
import os
import random
import re
import sys
import time
import urllib.parse
from pathlib import Path

import requests

UA = {"User-Agent": "SurnameOriginResearch/1.0 (data collection; contact: local)"}
OUT = Path(__file__).parent / "pipeline_out"

# ------------------------------------------------------------------ 枚举
# 换成你自己的枚举: python3 surname_pipeline.py run --enum-file my_enum.json
# 文件格式: {"derive_types": ["以国为氏", "以邑为氏", ...]}
DEFAULT_ENUM = [
    "以古姓为氏", "以国为氏", "以邑为氏", "以乡亭为氏", "以地为氏",
    "以字为氏", "以名为氏", "以次为氏", "以族为氏", "以官为氏",
    "以爵为氏", "以技为氏", "以事为氏", "以谥为氏",
    "赐姓避讳改姓", "少数民族汉化",
]

BAIJIAXING = list("赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜"
                  "戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐"
                  "费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄")

FIELDS = ["surname", "origin_era", "origin_place",
          "derive_type", "origin_story", "junwang"]

# 每个字段的选源优先级(左优先)
FIELD_PRIORITY = {
    "origin_era":   ["tianapi", "wiki", "shlib"],
    "origin_place": ["wiki", "tianapi", "shlib"],
    "derive_type":  ["wiki", "tianapi", "shlib"],   # 另有规则兜底, 见 classify_derive
    "origin_story": ["shlib", "wiki", "tianapi"],
    "junwang":      ["wiki", "shlib", "tianapi"],
}

TRAD2SIMP = {"國": "国", "為": "为", "號": "号", "職": "职", "謚": "谥", "諡": "谥",
             "賜": "赐", "諱": "讳", "複": "复", "數": "数", "採": "采", "後": "后"}


def t2s(s: str) -> str:
    return "".join(TRAD2SIMP.get(c, c) for c in s)


def clean_wiki(s: str) -> str:
    """去掉维基标记: 链接/注释/粗体/模板/ref"""
    if not s:
        return ""
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)          # 简单模板
    s = re.sub(r"\[\[[^\]|]*\|([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = s.replace("'''", "").replace("''", "")
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip(" |")


# ================================================================== 维基
class WikiSource:
    name = "wiki"
    API = "https://zh.wikipedia.org/w/api.php"

    def __init__(self, use_wikidata=False):
        self.use_wikidata = use_wikidata
        self.cache = OUT / "cache_wiki.json"
        self.cache = {}
        OUT.mkdir(exist_ok=True)
        self._load()

    def _load(self):
        f = OUT / "cache_wiki.json"
        if f.exists():
            try:
                self.cache = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                self.cache = {}

    def save(self):
        (OUT / "cache_wiki.json").write_text(
            json.dumps(self.cache, ensure_ascii=False), encoding="utf-8")

    def fetch(self, surnames):
        """批量取 wikitext, 返回 {姓: wikitext}"""
        todo = [s for s in surnames if s not in self.cache]
        for i in range(0, len(todo), 20):
            batch = todo[i:i + 20]
            titles = "|".join(f"{s}姓" for s in batch)
            p = {"action": "query", "prop": "revisions", "rvprop": "content",
                 "rvslots": "main", "titles": titles, "format": "json",
                 "formatversion": "2", "redirects": "1"}
            try:
                r = requests.get(self.API, params=p, headers=UA, timeout=40)
                j = r.json()
            except Exception as e:
                print("  [wiki] 批量失败:", e)
                continue
            for pg in j.get("query", {}).get("pages", []):
                if pg.get("missing"):
                    continue
                try:
                    txt = pg["revisions"][0]["slots"]["main"]["content"]
                except Exception:
                    continue
                title = pg.get("title", "")
                xing = title[:-1] if title.endswith(("姓", "氏")) else title
                self.cache[xing] = txt
            print(f"  [wiki] 已抓 {min(i + 20, len(todo))}/{len(todo)}")
            time.sleep(0.5)
        self.save()
        return {s: self.cache.get(s, "") for s in surnames}

    @staticmethod
    def parse_infobox(wikitext):
        """模板无关: 抓任意 infobox 的 |key = value"""
        out = {}
        m = re.search(r"\{\{\s*(?:Infobox[^\n|]*)[^}]*\}\}", wikitext,
                      flags=re.S | re.I)
        blocks = [m.group(0)] if m else re.findall(r"\{\{[^{}]*\}\}", wikitext)[:3]
        for b in blocks:
            for line in b.split("\n"):
                line = line.strip()
                if not line.startswith("|"):
                    continue
                if "=" not in line:
                    continue
                k, v = line[1:].split("=", 1)
                k = clean_wiki(k).strip()
                v = clean_wiki(v).strip()
                if k and v and k not in out:
                    out[k] = v
        return out

    @staticmethod
    def parse_section(wikitext, heads):
        """抓指定标题下的正文"""
        for h in heads:
            m = re.search(r"==+\s*%s\s*==+\s*(.*?)(?=\n==[^=]|\Z)" % h,
                          wikitext, flags=re.S)
            if m:
                return clean_wiki(m.group(1))[:1200]
        return ""

    def parse(self, xing, wikitext):
        if not wikitext:
            return {}
        ib = self.parse_infobox(wikitext)
        row = {}
        for k, v in ib.items():
            kk = t2s(k)
            if "郡望" in kk or "郡号" in kk:
                row["junwang"] = v
            elif "堂号" in kk:
                row.setdefault("_tanghao", v)
            elif "得姓" in kk or "方式" in kk:
                row["derive_type"] = v          # 枚举值, 不充作故事
            elif "起源" in kk or "源流" in kk:
                row.setdefault("origin_story", v)
            elif "始祖" in kk:
                row.setdefault("_shizu", v)

        prose = self.parse_section(wikitext, ["起源", "源流", "姓氏起源", "得姓", "历史"])
        if prose:
            row.setdefault("origin_story", prose[:400])
        if "origin_story" not in row:
            row["origin_story"] = clean_wiki(wikitext)[:400]

        if "junwang" not in row:
            m = re.search(r"郡望(?:主要)?(?:有|为|是)?[:：]?\s*([^\n。]{2,80})",
                          clean_wiki(wikitext))
            if m:
                row["junwang"] = m.group(1).strip()

        flat = clean_wiki(wikitext)
        m = re.search(r"(?:起源地|发源地|发祥地|起源于|源于)\s*[:：]?\s*"
                      r"([^\n。；;]{2,40})", flat)
        if m:
            row["origin_place"] = m.group(1).strip()
        else:
            # 兜底: 抓 "古地名（今xx）" 形式的括号注
            pairs = re.findall(r"([一-龥]{2,8})[（(]今([^）)]{2,20})[）)]", flat)
            if pairs:
                row["origin_place"] = "；".join(
                    f"{a}（今{b}）" for a, b in list(dict.fromkeys(pairs))[:3])
        return row


# ============================================================== 上海图书馆
class ShlibSource:
    name = "shlib"
    BASE = "http://data.library.sh.cn"

    def __init__(self, key):
        self.key = key
        self.cache = {}
        OUT.mkdir(exist_ok=True)
        f = OUT / "cache_shlib.json"
        if f.exists():
            try:
                self.cache = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                pass

    def save(self):
        (OUT / "cache_shlib.json").write_text(
            json.dumps(self.cache, ensure_ascii=False), encoding="utf-8")

    @staticmethod
    def _label(v):
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            for it in v:
                if isinstance(it, dict) and it.get("@language") in ("chs", "cht"):
                    return it.get("@value", "")
            for it in v:
                if isinstance(it, dict):
                    return it.get("@value", "")
        if isinstance(v, dict):
            return v.get("@value", "")
        return ""

    def fetch(self, surnames):
        todo = [s for s in surnames if s not in self.cache]
        for i, xing in enumerate(todo, 1):
            url = f"{self.BASE}/jp/familyname/{urllib.parse.quote(xing)}"
            try:
                r = requests.get(url, params={"key": self.key},
                                 headers=UA, timeout=25)
                j = r.json()
            except Exception as e:
                print(f"  [shlib] {xing} 失败: {e}")
                continue
            nodes = j.get("@graph") or [j] if isinstance(j, dict) else []
            desc, lab = "", ""
            for n in nodes:
                if isinstance(n, dict) and (n.get("description") or n.get("label")):
                    desc = self._label(n.get("description"))
                    lab = self._label(n.get("label"))
                    break
            self.cache[xing] = {"label": lab, "description": desc}
            print(f"  [shlib] {i}/{len(todo)} {xing} desc={len(desc)}字")
            time.sleep(0.3)
        self.save()
        return {s: self.cache.get(s, {}) for s in surnames}

    def parse(self, xing, rec):
        if not rec:
            return {}
        d = rec.get("description", "")
        row = {}
        if d:
            row["origin_story"] = d[:400]
        m = re.search(r"([一-龥]{1,6}郡)", d)
        if m:
            row["junwang"] = "；".join(list(dict.fromkeys(re.findall(r"[一-龥]{1,6}郡", d)))[:5])
        return row


# ================================================================ 天聚数行
class TianapiSource:
    name = "tianapi"
    API = "https://apis.tianapi.com/surname/index"
    STOP_CODES = {150}   # 配额耗尽 -> 停止本源, 其余源继续

    def __init__(self, key):
        self.key = key
        self.cache = {}
        self.quota_out = False
        OUT.mkdir(exist_ok=True)
        f = OUT / "cache_tianapi.json"
        if f.exists():
            try:
                self.cache = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                pass

    def save(self):
        (OUT / "cache_tianapi.json").write_text(
            json.dumps(self.cache, ensure_ascii=False), encoding="utf-8")

    def fetch(self, surnames):
        todo = [s for s in surnames if s not in self.cache]
        for i, xing in enumerate(todo, 1):
            if self.quota_out:
                print("  [tianapi] 当日配额耗尽, 本源停止(明日重跑自动续)")
                break
            try:
                r = requests.get(self.API, params={"key": self.key, "xing": xing},
                                 headers=UA, timeout=25)
                j = r.json()
            except Exception as e:
                print(f"  [tianapi] {xing} 失败: {e}")
                continue
            if j.get("code") in self.STOP_CODES:
                self.quota_out = True
                break
            if j.get("code") != 200:
                continue
            self.cache[xing] = (j.get("result") or {}).get("content", "")
            print(f"  [tianapi] {i}/{len(todo)} {xing} ok")
            time.sleep(0.4 + random.uniform(0, 0.2))
        self.save()
        return {s: self.cache.get(s, "") for s in surnames}

    def parse(self, xing, content):
        if not content:
            return {}
        flat = re.sub(r"<[^>]+>", "", content).replace("｢", "「").replace("｣", "」")
        flat = re.sub(r"\s+", " ", flat).strip()
        row = {}
        m = re.search(r"郡望[:：]?\s*([^\n]{2,200}?)(?=堂号|开基始祖|分布|历史名人|$)", flat)
        seg = m.group(1) if m else flat
        row["junwang"] = "；".join(list(dict.fromkeys(re.findall(r"[一-龥]{1,6}郡", seg)))[:6])
        m = re.search(r"(?:得姓始祖|开基始祖|始祖)[:：是为\s]*([一-龥·]{2,8})", flat)
        if m:
            row["_shizu"] = m.group(1).strip()
        m = re.search(r"源出[:：]?\s*([^\n]{0,80})", flat) or \
            re.search(r"历史来源[:：]?\s*([^\n]{0,120})", flat)
        row["origin_story"] = (m.group(1).strip() if m else flat[:200])
        return row


# ============================================================== 规则推断
# 双层判定: 朝代线索优先于传说人物, 且优先在"动作句"(含封/建/为氏/赐姓)里找。
# 原因: 姓氏文常先说远祖(舜/黄帝)再说真正的得姓事件(西周封国), 只按出现顺序会误判为上古。
ERA_DYNASTY = [(r"夏(朝|代)?", "夏朝"), (r"商(朝|代)?|殷(朝|代)?", "商朝"),
               (r"西周|东周|春秋|战国|周(朝|代)?", "周朝"), (r"秦(朝|代)?", "秦朝"),
               (r"西汉|东汉|汉(朝|代)?", "汉朝"),
               (r"三国|两晋|魏晋|南北朝", "魏晋南北朝"),
               (r"隋(朝|代)?", "隋朝"), (r"唐(朝|代)?", "唐朝"),
               (r"宋(朝|代)?", "宋朝"), (r"元(朝|代)?", "元朝"),
               (r"明(朝|代)?", "明朝"), (r"清(朝|代)?", "清朝")]
ERA_MYTH = [(r"上古|黄帝|炎帝|伏羲|颛顼|帝喾|尧|舜", "上古")]
ACTION_RE = re.compile(r"封|建|立国|为氏|赐姓|改姓|命氏|受封")


def guess_era(text):
    text = text[:1500]
    sents = re.split(r"[。；;！？\n]", text)
    action = " ".join(s for s in sents if ACTION_RE.search(s))
    for pool in (action, text):          # 先动作句, 再全文
        for pat, era in ERA_DYNASTY:
            if re.search(pat, pool):
                return era
    for pat, era in ERA_MYTH:            # 都找不到朝代才认传说期
        if re.search(pat, text):
            return era
    return ""

DERIVE_RULES = [(r"以国为氏|以国为姓|国名为氏|封国", "以国为氏"),
                (r"以邑为氏|采邑|食邑|封邑|以封地", "以邑为氏"),
                (r"以乡为氏|以亭为氏", "以乡亭为氏"),
                (r"以地为氏|以居(住)?地为氏|居住(地|于)", "以地为氏"),
                (r"以官为氏|官职为氏|以职官|司马|司徒|司空|司寇|太史", "以官为氏"),
                (r"以爵为氏|以爵位", "以爵为氏"),
                (r"以谥为氏|谥号", "以谥为氏"),
                (r"以字为氏|以王父字|以祖父字", "以字为氏"),
                (r"以名为氏", "以名为氏"),
                (r"以次为氏|排行|伯仲叔季", "以次为氏"),
                (r"以族为氏", "以族为氏"),
                (r"以技为氏|以职业|以技艺", "以技为氏"),
                (r"以事为氏", "以事为氏"),
                (r"赐姓|避讳|改姓", "赐姓避讳改姓"),
                (r"鲜卑|匈奴|契丹|女真|蒙古|满(洲|族)?|回族|少数民族|汉化|改为.{1,2}氏",
                 "少数民族汉化"),
                (r"以古姓为氏|出自[姬姜姒嬴妘妫姚姞子芈]姓", "以古姓为氏")]


def guess(patterns, text):
    for pat, val in patterns:
        if re.search(pat, text):
            return val
    return ""


def normalize_derive(raw, enum):
    """把来源里的原始说法映射到枚举; 对不上就返回空"""
    if not raw:
        return ""
    r = t2s(raw)
    for e in enum:
        if e in r:
            return e
    return ""


def classify_derive(texts, enum, wiki_direct=""):
    """优先级: 维基显式字段 > 各源文本规则推断"""
    d = normalize_derive(wiki_direct, enum)
    if d:
        return d, "wiki字段"
    for t in texts:
        g = guess(DERIVE_RULES, t)
        if g and g in enum:
            return g, "规则推断"
    return "", ""


# ================================================================== 合并
def merge(surname, per_source, enum):
    """per_source: {源名: {字段: 值}}"""
    row = {f: "" for f in FIELDS}
    src_of = {f: "" for f in FIELDS}
    row["surname"] = surname
    src_of["surname"] = "输入"

    all_text = " ".join(
        str(v) for s in per_source.values() for v in s.values()
        if isinstance(v, str) and not v.startswith("_"))

    for f in ["origin_era", "origin_place", "origin_story", "junwang"]:
        for sname in FIELD_PRIORITY[f]:
            v = (per_source.get(sname) or {}).get(f, "")
            if v:
                row[f] = v
                src_of[f] = sname
                break
        if not row[f]:
            row[f] = ""
    if not row["junwang"]:
        for sname, d in per_source.items():
            if (d or {}).get("_tanghao"):     # 堂号作郡望代理
                row["junwang"] = "堂号:" + d["_tanghao"]
                src_of["junwang"] = sname + "(堂号代理)"
                break

    dt, how = classify_derive(
        [(per_source.get(s) or {}).get("origin_story", "")
         for s in ["wiki", "tianapi", "shlib"]],
        enum, (per_source.get("wiki") or {}).get("derive_type", ""))
    row["derive_type"] = dt
    src_of["derive_type"] = how or "未定"

    if not row["origin_era"]:
        row["origin_era"] = guess_era(all_text)
        src_of["origin_era"] = "规则推断" if row["origin_era"] else ""

    conf = sum(1 for f in FIELDS[1:] if row[f]) / 5.0
    needs_review = 0 if (row["derive_type"] and row["junwang"]
                         and row["origin_era"] and row["origin_place"]) else 1
    row["_confidence"] = round(conf, 2)
    row["_needs_review"] = needs_review
    for f in FIELDS[1:]:
        row[f + "_src"] = src_of[f]
    return row


# ================================================================== 输出
def write_outputs(rows, enum):
    cols = FIELDS + ["_confidence", "_needs_review"] + [f + "_src" for f in FIELDS[1:]]
    csv_p = OUT / "dataset.csv"
    with open(csv_p, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    rev_p = OUT / "review_queue.csv"
    rev = [r for r in rows if r["_needs_review"] == 1]
    with open(rev_p, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rev)

    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment
        wb = Workbook()
        ws = wb.active
        ws.title = "姓氏源流"
        ws.append(cols)
        for c in ws[1]:
            c.font = Font(bold=True)
        for r in rows:
            ws.append([r.get(c, "") for c in cols])
        for i, wd in enumerate([10, 12, 24, 16, 55, 30, 10, 12, 12, 14, 16, 14], 1):
            ws.column_dimensions[chr(64 + i)].width = wd
        for rr in ws.iter_rows(min_row=2):
            for c in rr:
                c.alignment = Alignment(vertical="top", wrap_text=True)
        ws.freeze_panes = "A2"

        doc = wb.create_sheet("字段与来源说明")
        doc.append(["字段", "类型", "说明", "取值来源优先级"])
        for c in doc[1]:
            c.font = Font(bold=True)
        meta = [("surname", "string", "姓氏(简体, 单字或复姓)", "输入"),
                ("origin_era", "string", "起源年代/朝代",
                 " > ".join(FIELD_PRIORITY["origin_era"]) + " > 规则推断"),
                ("origin_place", "string", "起源地(古地名, 可附今地)",
                 " > ".join(FIELD_PRIORITY["origin_place"]) + " (各源均弱, 多需人工)"),
                ("derive_type", "string", "得姓方式(枚举)",
                 "维基显式字段 > 规则推断(必须人工抽检)"),
                ("origin_story", "text", "得姓缘由 2-4 句",
                 " > ".join(FIELD_PRIORITY["origin_story"])),
                ("junwang", "string", "郡望, 多个用；分隔",
                 " > ".join(FIELD_PRIORITY["junwang"]) + " > 堂号代理"),
                ("_confidence", "float", "非 story 字段填充率", "-"),
                ("_needs_review", "int", "1=需人工复核(字段缺失)", "-")]
        for m in meta:
            doc.append(list(m))
        doc.append([])
        doc.append(["derive_type 枚举(当前)"])
        for e in enum:
            doc.append([e])
        for i, wd in enumerate([16, 10, 40, 46], 1):
            doc.column_dimensions[chr(64 + i)].width = wd
        for rr in doc.iter_rows(min_row=2):
            for c in rr:
                c.alignment = Alignment(vertical="top", wrap_text=True)
        xlsx_p = OUT / "dataset.xlsx"
        wb.save(xlsx_p)
        print("已写出", xlsx_p)
    except Exception as e:
        print("xlsx 跳过:", e)

    print("已写出", csv_p)
    print("待人工复核:", rev_p, f"({len(rev)}/{len(rows)})")
    return len(rev), len(rows)


# ================================================================== 命令
def cmd_run(args):
    enum = DEFAULT_ENUM
    if args.enum_file and Path(args.enum_file).exists():
        enum = json.loads(Path(args.enum_file).read_text(
            encoding="utf-8"))["derive_types"]
        print("使用自定义枚举:", len(enum), "类")

    OUT.mkdir(exist_ok=True)
    surnames = ([s for s in args.surnames.split(",") if s.strip()]
                if args.surnames else BAIJIAXING[:args.limit])
    sources = set(args.sources.split(","))
    print(f"姓氏 {len(surnames)} 个, 数据源: {sorted(sources)}")

    raw = {}
    if "wiki" in sources:
        print("[1/3] 中文维基 ...")
        w = WikiSource()
        got = w.fetch(surnames)
        raw["wiki"] = {s: w.parse(s, got.get(s, "")) for s in surnames}
    if "shlib" in sources:
        k = os.environ.get("SHLIB_KEY", "").strip()
        if not k:
            print("[2/3] 跳过 shlib (未设 SHLIB_KEY)")
        else:
            print("[2/3] 上海图书馆 ...")
            s = ShlibSource(k)
            got = s.fetch(surnames)
            raw["shlib"] = {x: s.parse(x, got.get(x, {})) for x in surnames}
    if "tianapi" in sources:
        k = os.environ.get("TIANAPI_KEY", "").strip()
        if not k:
            print("[3/3] 跳过 tianapi (未设 TIANAPI_KEY)")
        else:
            print("[3/3] 天聚数行 ...")
            t = TianapiSource(k)
            got = t.fetch(surnames)
            raw["tianapi"] = {x: t.parse(x, got.get(x, "")) for x in surnames}

    rows = [merge(s, {k: v.get(s, {}) for k, v in raw.items()}, enum)
            for s in surnames]
    nrev, n = write_outputs(rows, enum)

    print("\n—— 覆盖率 ——")
    for f in FIELDS[1:]:
        c = sum(1 for r in rows if r[f])
        print(f"  {f:14s} {c}/{n}  {c / n * 100:.0f}%")
    print(f"\n可直接使用 {n - nrev} 条, 待人工复核 {nrev} 条。")
    print("提示: origin_place 与 derive_type 各源覆盖都弱, 建议以 review_queue.csv 为底人工过一遍。")


def cmd_probe(args):
    if args.source == "wiki":
        w = WikiSource()
        got = w.fetch([args.xing])
        txt = got.get(args.xing, "")
        print("wikitext 长度:", len(txt))
        print(txt[:1500])
        print("\n--- infobox ---")
        print(json.dumps(w.parse_infobox(txt), ensure_ascii=False, indent=1))
        print("--- 解析 ---")
        print(json.dumps(w.parse(args.xing, txt), ensure_ascii=False, indent=1))
    elif args.source == "shlib":
        k = os.environ.get("SHLIB_KEY", "")
        if not k:
            sys.exit("需 SHLIB_KEY")
        s = ShlibSource(k)
        r = requests.get(f"{s.BASE}/jp/familyname/{urllib.parse.quote(args.xing)}",
                         params={"key": k}, headers=UA, timeout=25)
        print(r.text[:3000])
    elif args.source == "tianapi":
        k = os.environ.get("TIANAPI_KEY", "")
        if not k:
            sys.exit("需 TIANAPI_KEY")
        r = requests.get(TianapiSource.API, params={"key": k, "xing": args.xing},
                         headers=UA, timeout=25)
        print(r.text[:3000])


def cmd_selftest(args):
    """离线自检: 用文档中的真实返回样例验证解析逻辑"""
    print("== 自检 ==\n")
    ok = True

    wiki_txt = """{{Infobox 姓氏
| 姓氏 = 陈
| 郡望 = [[颍川郡]]、[[汝南郡]]、[[下邳郡]]
| 堂号 = 颍川堂、德星堂
| 得姓方式 = 以国为氏
}}
'''陈姓'''是[[汉字文化圈]]的姓氏。
== 起源 ==
陈姓出自[[妫姓]]，是[[舜]]帝的后裔。[[西周]]初年，[[周武王]]封舜的后人[[妫满]]于'''陈'''（今[[河南]][[淮阳]]），建立[[陈国]]，其后人以国为氏。
== 分布 ==
主要分布在南方。
"""
    w = WikiSource()
    r = w.parse("陈", wiki_txt)
    print("[wiki] 解析:", json.dumps(r, ensure_ascii=False))
    for key, want in [("junwang", "颍川郡"), ("derive_type", "以国为氏"),
                      ("origin_place", None)]:
        got = r.get(key, "")
        hit = (want in got) if want else bool(got)
        print(f"   {key:12s} {'OK' if hit else 'MISS'}  -> {got[:60]}")
        ok &= hit

    shlib_j = {"@graph": [{
        "@id": "http://data.library.sh.cn/authority/familyname/9i5ukkrs9ebh6qmz",
        "@type": "http://www.library.sh.cn/ontology/FamilyName",
        "label": [{"@language": "chs", "@value": "陈"},
                  {"@language": "cht", "@value": "陳"}],
        "description": "见于《世本》。西汉《急就章》列为汉代常见姓氏之一。宋《百家姓》列为第010姓。"}]}
    s = ShlibSource("dummy")
    rec = {"label": ShlibSource._label(shlib_j["@graph"][0]["label"]),
           "description": shlib_j["@graph"][0]["description"]}
    r2 = s.parse("陈", rec)
    print("\n[shlib] 解析:", json.dumps(r2, ensure_ascii=False))
    hit = "世本" in r2.get("origin_story", "")
    print(f"   origin_story {'OK' if hit else 'MISS'}")
    ok &= hit

    tian_c = ("陈氏 历史来源 「陈」源出 ; 一 ; 出自「妫」姓。以国为氏。"
              "得姓始祖 陈胡公。 郡望 颍川郡: 秦置。汝南郡、下邳郡次之。"
              "开基始祖为陈寔。")
    t = TianapiSource("dummy")
    r3 = t.parse("陈", tian_c)
    print("\n[tianapi] 解析:", json.dumps(r3, ensure_ascii=False))
    hit = "颍川郡" in r3.get("junwang", "") and r3.get("_shizu") == "陈胡公"
    print(f"   junwang+始祖 {'OK' if hit else 'MISS'}")
    ok &= hit

    merged = merge("陈", {"wiki": r, "shlib": r2, "tianapi": r3}, DEFAULT_ENUM)
    print("\n[合并] :", json.dumps(merged, ensure_ascii=False, indent=1))
    hit = (merged["derive_type"] == "以国为氏"
           and "颍川郡" in merged["junwang"]
           and merged["origin_era"] == "周朝")
    print(f"   合并结果 {'OK' if hit else 'CHECK'}")
    ok &= hit

    print("\n自检", "通过" if ok else "存在未命中项(见上)")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="姓氏源流三源统一抓取管线")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run")
    r.add_argument("--limit", type=int, default=100)
    r.add_argument("--surnames", default="")
    r.add_argument("--sources", default="wiki,shlib,tianapi")
    r.add_argument("--enum-file", default="")
    r.set_defaults(func=cmd_run)

    p = sub.add_parser("probe")
    p.add_argument("xing")
    p.add_argument("--source", choices=["wiki", "shlib", "tianapi"], default="wiki")
    p.set_defaults(func=cmd_probe)

    e = sub.add_parser("show-enum")
    e.set_defaults(func=lambda a: print("\n".join(DEFAULT_ENUM)))

    sub.add_parser("selftest").set_defaults(func=cmd_selftest)

    a = ap.parse_args()
    rc = a.func(a)
    sys.exit(rc or 0)


if __name__ == "__main__":
    main()
