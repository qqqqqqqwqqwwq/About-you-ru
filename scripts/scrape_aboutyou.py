#!/usr/bin/env python3
"""Scrape About You SK sale catalog into data/products.json.

Business rules:
- Only products with sale priceEur > 50
- Target ~100 total (~50 women / ~50 men), spread across category_sources.json
- Translate titles/descriptions SK/EN → RU
- Extract material/composition from PDP
"""

from __future__ import annotations

import sys
try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

import html as html_lib
import json
import re
import time
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
BASE = "https://www.aboutyou.sk"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data"
PRODUCTS_PATH = OUT_DIR / "products.json"
STATS_PATH = OUT_DIR / "SCRAPE_STATS.json"
SOURCES_PATH = OUT_DIR / "category_sources.json"
DELAY = 0.4
TIMEOUT = 25
MIN_PRICE_EUR = 50.0
TARGET_PER_GENDER = 50
PER_CATEGORY_TARGET = 5  # soft cap; fill to gender target afterward

TILE_RE = re.compile(
    r'"productTile":\{"productId":(\d+),"link":\{"url":"(/p/[^"]+)"'
)
PRICE_AFTER_TILE = re.compile(
    r'"price":\{"price":\{"amount":(\d+),"currencyCode":"EUR"\}'
)
STRIKE_RE = re.compile(
    r'"strikePrice":\{"amount":(\d+),"currencyCode":"EUR"\}'
)

# Fashion term dictionary SK/EN → RU (longest keys first)
FASHION_DICT: list[tuple[str, str]] = [
    ("vo farbe", "в цвете"),
    ("v farbe", "в цвете"),
    ("in Farbe", "в цвете"),
    ("in colour", "в цвете"),
    ("in color", "в цвете"),
    ("Námornícka Modrá", "тёмно-синий"),
    ("námornícka modrá", "тёмно-синий"),
    ("tmavomodrá", "тёмно-синий"),
    ("svetlomodrá", "голубой"),
    ("svetlosivá", "светло-серый"),
    ("tmavosivá", "тёмно-серый"),
    ("svetloružová", "светло-розовый"),
    ("tmavoružová", "тёмно-розовый"),
    ("béžová", "бежевый"),
    ("čierna", "чёрный"),
    ("čiernej", "чёрный"),
    ("biela", "белый"),
    ("bielej", "белый"),
    ("hnedá", "коричневый"),
    ("hnedej", "коричневый"),
    ("červená", "красный"),
    ("červenej", "красный"),
    ("zelená", "зелёный"),
    ("zelenej", "зелёный"),
    ("modrá", "синий"),
    ("modrej", "синий"),
    ("ružová", "розовый"),
    ("ružovej", "розовый"),
    ("fialová", "фиолетовый"),
    ("žltá", "жёлтый"),
    ("oranžová", "оранжевый"),
    ("sivá", "серый"),
    ("sivej", "серый"),
    ("zlatá", "золотой"),
    ("strieborná", "серебряный"),
    ("khaki", "хаки"),
    ("cream", "кремовый"),
    ("navy", "тёмно-синий"),
    ("black", "чёрный"),
    ("white", "белый"),
    ("grey", "серый"),
    ("gray", "серый"),
    ("beige", "бежевый"),
    ("brown", "коричневый"),
    ("green", "зелёный"),
    ("blue", "синий"),
    ("red", "красный"),
    ("pink", "розовый"),
    ("purple", "фиолетовый"),
    ("yellow", "жёлтый"),
    ("orange", "оранжевый"),
    ("Svetre & Pleteniny", "Свитеры и трикотаж"),
    ("Svetre & kardigány", "Свитеры и кардиганы"),
    ("Blúzky & tuniky", "Блузки и туники"),
    ("Obleky & saká", "Костюмы и пиджаки"),
    ("kardigán", "кардиган"),
    ("kardigan", "кардиган"),
    ("sveter", "свитер"),
    ("pletenina", "трикотаж"),
    ("mikina", "худи"),
    ("hoodie", "худи"),
    ("sweatshirt", "свитшот"),
    ("bunda", "куртка"),
    ("kabát", "пальто"),
    ("kabaty", "пальто"),
    ("sako", "пиджак"),
    ("saká", "пиджаки"),
    ("overal", "комбинезон"),
    ("overall", "комбинезон"),
    ("jumpsuit", "комбинезон"),
    ("nohavice", "брюки"),
    ("nohavíc", "брюк"),
    ("rifle", "джинсы"),
    ("riflí", "джинсов"),
    ("sukňa", "юбка"),
    ("sukne", "юбки"),
    ("šaty", "платье"),
    ("saty", "платье"),
    ("blúzka", "блузка"),
    ("bluzka", "блузка"),
    ("tunika", "туника"),
    ("košeľa", "рубашка"),
    ("koseľa", "рубашка"),
    ("tričko", "футболка"),
    ("tricko", "футболка"),
    ("topánky", "обувь"),
    ("tenisky", "кроссовки"),
    ("sneakers", "кроссовки"),
    ("boots", "ботинки"),
    ("sandals", "сандалии"),
    ("dress", "платье"),
    ("jacket", "куртка"),
    ("coat", "пальто"),
    ("blazer", "пиджак"),
    ("trousers", "брюки"),
    ("pants", "брюки"),
    ("jeans", "джинсы"),
    ("skirt", "юбка"),
    ("blouse", "блузка"),
    ("shirt", "рубашка"),
    ("sweater", "свитер"),
    ("cardigan", "кардиган"),
    ("pullover", "пуловер"),
    ("knit", "трикотаж"),
    ("sneakers", "кроссовки"),
    ("shoes", "обувь"),
    ("cotton", "хлопок"),
    ("polyester", "полиэстер"),
    ("viscose", "вискоза"),
    ("elastane", "эластан"),
    ("wool", "шерсть"),
    ("linen", "лён"),
    ("silk", "шёлк"),
    ("leather", "кожа"),
    ("suede", "замша"),
    ("bavlna", "хлопок"),
    ("polyester", "полиэстер"),
    ("viskóza", "вискоза"),
    ("elastan", "эластан"),
    ("vlna", "шерсть"),
    ("ľan", "лён"),
    ("hodváb", "шёлк"),
    ("koža", "кожа"),
    ("semiš", "замша"),
    ("Zloženie", "Состав"),
    ("Materiál", "Материал"),
    ("Description", "Описание"),
    ("Popis", "Описание"),
]


def fetch(url: str, retries: int = 3) -> str | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
        },
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            wait = 1.5 * (attempt + 1)
            print(f"  fetch fail {url} attempt {attempt+1}: {e}; sleep {wait}s")
            time.sleep(wait)
    return None


def cents_to_eur(cents: int | None) -> float | None:
    if cents is None:
        return None
    return round(cents / 100.0, 2)


def unescape(s: str) -> str:
    s = html_lib.unescape(s)
    s = s.replace("\\u0026", "&").replace("\\/", "/")
    s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    return s.strip()


def dict_translate(text: str) -> str:
    """Apply fashion dictionary (case-insensitive, longest match)."""
    if not text:
        return text
    out = text
    # Sort by length descending each time for overlapping
    for sk, ru in sorted(FASHION_DICT, key=lambda x: len(x[0]), reverse=True):
        out = re.sub(re.escape(sk), ru, out, flags=re.IGNORECASE)
    return out


_translator = None
_translate_cache: dict[str, str] = {}


def get_translator():
    global _translator
    if _translator is not None:
        return _translator
    try:
        from deep_translator import MyMemoryTranslator, GoogleTranslator

        class Hybrid:
            def translate(self, text: str) -> str:
                text = text.strip()
                if not text:
                    return text
                if text in _translate_cache:
                    return _translate_cache[text]
                # Pre-apply dictionary for better results
                pre = dict_translate(text)
                # If mostly Cyrillic already, done
                cyr = len(re.findall(r"[А-Яа-яЁё]", pre))
                lat = len(re.findall(r"[A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž]", pre))
                if lat == 0 or cyr > lat * 2:
                    _translate_cache[text] = pre
                    return pre
                result = pre
                try:
                    mm = MyMemoryTranslator(source="sk-SK", target="ru-RU")
                    result = mm.translate(pre[:450])
                    time.sleep(0.35)
                except Exception:
                    try:
                        gt = GoogleTranslator(source="auto", target="ru")
                        result = gt.translate(pre[:4500])
                        time.sleep(0.6)
                    except Exception:
                        result = pre
                result = dict_translate(result or pre)
                _translate_cache[text] = result
                return result

        _translator = Hybrid()
        return _translator
    except Exception as e:  # noqa: BLE001
        print(f"  translator init failed: {e}; using dictionary only")

        class DictOnly:
            def translate(self, text: str) -> str:
                return dict_translate(text)

        _translator = DictOnly()
        return _translator


def translate_to_ru(text: str) -> str:
    if not text:
        return ""
    t = get_translator()
    try:
        return t.translate(text)
    except Exception as e:  # noqa: BLE001
        print(f"  translate fail: {e}")
        return dict_translate(text)


def extract_tiles(html: str) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    for m in TILE_RE.finditer(html):
        pid, path = m.group(1), m.group(2)
        window = html[m.start() : m.start() + 3500]
        price_m = PRICE_AFTER_TILE.search(window)
        strike_m = STRIKE_RE.search(window)
        price = int(price_m.group(1)) if price_m else None
        strike = int(strike_m.group(1)) if strike_m else None
        products.append(
            {
                "id": pid,
                "path": path,
                "price_cents": price,
                "strike_cents": strike,
            }
        )
    return products


def clean_image_url(url: str) -> str:
    return url.split("?")[0]


def extract_description(html: str) -> str:
    # Common About You patterns
    patterns = [
        r'"description"\s*:\s*"((?:[^"\\]|\\.)*)"',
        r'"productDescription"\s*:\s*"((?:[^"\\]|\\.)*)"',
        r'data-testid="productDescription"[^>]*>(.*?)</div>',
        r'"longDescription"\s*:\s*"((?:[^"\\]|\\.)*)"',
        r'"descriptionText"\s*:\s*"((?:[^"\\]|\\.)*)"',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.DOTALL | re.I)
        if m:
            raw = m.group(1)
            raw = unescape(raw)
            raw = re.sub(r"<[^>]+>", " ", raw)
            raw = re.sub(r"\s+", " ", raw).strip()
            if len(raw) > 20:
                return raw[:2000]
    # Attribute-style description blocks
    m = re.search(
        r'(?:Popis|Description|Produktbeschreibung)[^<]{0,40}</[^>]+>\s*<[^>]+>([^<]{30,800})',
        html,
        re.I,
    )
    if m:
        return unescape(m.group(1)).strip()
    return ""


def extract_materials(html: str) -> tuple[str | None, list[str]]:
    materials: list[str] = []
    material: str | None = None

    # Structured attributes
    for m in re.finditer(
        r'"(?:material|composition|Materiál|Zloženie|Materialzusammensetzung)"\s*:\s*"((?:[^"\\]|\\.)*)"',
        html,
        re.I,
    ):
        val = unescape(m.group(1)).strip()
        if val and val not in materials and len(val) < 200:
            materials.append(val)

    # Attribute label/value pairs in JSON
    for m in re.finditer(
        r'"label"\s*:\s*"(Materiál|Zloženie|Material|Composition|Stoff)"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"',
        html,
        re.I,
    ):
        val = unescape(m.group(2)).strip()
        if val and val not in materials:
            materials.append(val)

    # name/value alternate order
    for m in re.finditer(
        r'"name"\s*:\s*"(Materiál|Zloženie|Material|Composition)"\s*,\s*"values?"\s*:\s*(?:\[\s*")?((?:[^"\\]|\\.)*)"',
        html,
        re.I,
    ):
        val = unescape(m.group(2)).strip()
        if val and val not in materials:
            materials.append(val)

    # Percent composition patterns
    for m in re.finditer(
        r'(\d{1,3}\s*%\s*[A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž /]+(?:\s*,\s*\d{1,3}\s*%\s*[A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž /]+)*)',
        html,
    ):
        val = unescape(m.group(1)).strip()
        if 5 < len(val) < 180 and val not in materials:
            materials.append(val)
            if len(materials) >= 5:
                break

    if materials:
        material = materials[0]
        # Translate material strings lightly
        materials = [dict_translate(x) for x in materials[:6]]
        material = materials[0]
    return material, materials


def extract_pdp(html: str, fallback: dict) -> dict[str, Any] | None:
    title = None
    m = re.search(r'data-testid="productName"[^>]*>([^<]+)<', html)
    if m:
        title = unescape(m.group(1))
    if not title:
        m = re.search(r'"productName"\s*:\s*"((?:[^"\\]|\\.)*)"', html)
        if m:
            title = unescape(m.group(1))
    if not title:
        m = re.search(r"<h1[^>]*>([^<]+)</h1>", html)
        if m:
            title = unescape(m.group(1))

    brand = None
    m = re.search(r'data-testid="brandNameContainer"[^>]*>([^<]+)<', html)
    if m:
        brand = unescape(m.group(1))
    if not brand:
        m = re.search(r'"brand"\s*:\s*\{[^}]*?"name"\s*:\s*"((?:[^"\\]|\\.)*)"', html)
        if m:
            brand = unescape(m.group(1))
    if not brand and title:
        parts = title.split(" ", 1)
        if parts:
            brand = parts[0]

    image_urls: list[str] = []
    for m in re.finditer(
        r'"image":\{"src":"(https://cdn\.aboutstatic\.com/file/images/[^"]+)"',
        html,
    ):
        u = clean_image_url(m.group(1))
        if u not in image_urls:
            image_urls.append(u)
    if len(image_urls) < 2:
        for u in re.findall(
            r"https://cdn\.aboutstatic\.com/file/images/[a-f0-9]{32}\.(?:jpg|jpeg|png|webp)",
            html,
            re.I,
        ):
            u = clean_image_url(u)
            if u not in image_urls:
                image_urls.append(u)

    sizes: list[str] = []
    for m in re.finditer(
        r'"quantity":(\d+),"vendorSize":\{"size":\{"\$case":"singleDimension",'
        r'"singleDimension":\{"dimension":"([^"]+)"\}\}',
        html,
    ):
        qty, dim = int(m.group(1)), m.group(2)
        if qty > 0 and dim not in sizes:
            sizes.append(dim)
    if not sizes:
        for block in re.finditer(r'"sizes":\[(.*?)\]', html, re.DOTALL):
            chunk = block.group(1)[:8000]
            for sm in re.finditer(
                r'"quantity":(\d+).{0,300}?"dimension":"([^"]+)"', chunk, re.DOTALL
            ):
                if int(sm.group(1)) > 0 and sm.group(2) not in sizes:
                    sizes.append(sm.group(2))
            if sizes:
                break

    price_cents = fallback.get("price_cents")
    strike_cents = fallback.get("strike_cents")
    m = re.search(r'"withTax":(\d+),"tax":\d+,"currencyCode":"EUR"', html)
    if m:
        price_cents = int(m.group(1))
    m = re.search(r'"campaignReduction":\{"priceBeforeWithTax":(\d+)', html)
    if m:
        strike_cents = int(m.group(1))
    else:
        m = re.search(r'"saleReduction":\{"priceBeforeWithTax":(\d+)', html)
        if m and strike_cents is None:
            strike_cents = int(m.group(1))

    if not title or price_cents is None:
        return None

    price_eur = cents_to_eur(price_cents)
    if price_eur is None or price_eur <= MIN_PRICE_EUR:
        return None

    was = cents_to_eur(strike_cents)
    if was is not None and was <= price_eur:
        was = None

    if not image_urls:
        for u in re.findall(
            r'https://cdn\.aboutstatic\.com/[^"\'\\\s]+\.(?:jpg|jpeg|png|webp)',
            html,
            re.I,
        ):
            u = clean_image_url(u)
            if "logo" in u.lower() or "icon" in u.lower():
                continue
            if u not in image_urls:
                image_urls.append(u)
            if len(image_urls) >= 5:
                break
    if not image_urls:
        return None

    desc_raw = extract_description(html)
    material, materials = extract_materials(html)

    # Translate title: keep brand prefix intact when possible
    title_for_tr = title
    if brand and title.startswith(brand):
        rest = title[len(brand) :].strip()
        title_ru = f"{brand} {translate_to_ru(rest)}".strip() if rest else brand
    else:
        title_ru = translate_to_ru(title)

    desc_ru = translate_to_ru(desc_raw) if desc_raw else ""
    if not desc_ru:
        cat_name = fallback.get("categoryNameRu", "")
        desc_ru = f"{brand or ''} — {cat_name}. Товар из распродажи About You.".strip(" —")

    return {
        "id": fallback["id"],
        "titleRu": title_ru,
        "brand": brand or "UNKNOWN",
        "category": fallback["category"],
        "categorySlug": fallback["categorySlug"],
        "categoryNameRu": fallback["categoryNameRu"],
        "priceEur": price_eur,
        "priceEurWas": was,
        "sizes": sizes,
        "imageUrl": image_urls[0],
        "imageUrls": image_urls[:12],
        "descriptionRu": desc_ru,
        "material": material,
        "materials": materials,
        "inStock": bool(sizes) if sizes else True,
    }


def collect_subcategory(
    gender: str, cat: dict, seen_ids: set[str]
) -> list[dict]:
    """Collect candidate tiles with priceEur > 50 from a subcategory page."""
    path = cat["path"]
    url = BASE + path
    print(f"\n=== [{gender}] {cat['slug']} {path} ===")
    html = fetch(url)
    time.sleep(DELAY)
    candidates: list[dict] = []
    if not html:
        print("  FAILED category page")
        return candidates

    tiles = extract_tiles(html)
    print(f"  tiles: {len(tiles)}")

    # Also try sorting / brand filters lightly if few expensive items
    pages_html = [html]
    # Try a couple brand filters from page for variety
    brands = sorted(set(re.findall(r"[?&]brand=([a-z0-9-]+)", html)))[:3]
    for brand in brands:
        if sum(1 for t in tiles if t.get("price_cents") and t["price_cents"] > MIN_PRICE_EUR * 100) >= 40:
            break
        h = fetch(f"{BASE}{path}?brand={brand}")
        time.sleep(0.25)
        if h:
            pages_html.append(h)
            tiles.extend(extract_tiles(h))

    # Dedupe tiles
    by_id: dict[str, dict] = {}
    for t in tiles:
        pid = t["id"]
        if pid in seen_ids:
            continue
        if pid not in by_id:
            by_id[pid] = t
        else:
            if by_id[pid]["price_cents"] is None and t["price_cents"]:
                by_id[pid]["price_cents"] = t["price_cents"]
            if by_id[pid]["strike_cents"] is None and t["strike_cents"]:
                by_id[pid]["strike_cents"] = t["strike_cents"]

    for pid, t in by_id.items():
        pc = t.get("price_cents")
        if pc is None:
            continue
        if pc / 100.0 <= MIN_PRICE_EUR:
            continue
        candidates.append(
            {
                "id": pid,
                "path": t["path"],
                "price_cents": t["price_cents"],
                "strike_cents": t["strike_cents"],
                "category": gender,
                "categorySlug": cat["slug"],
                "categoryNameRu": cat["nameRu"],
            }
        )

    # Prefer higher prices / variety — sort by price desc
    candidates.sort(key=lambda x: -(x["price_cents"] or 0))
    print(f"  candidates priceEur>{MIN_PRICE_EUR}: {len(candidates)}")
    return candidates


def main() -> None:
    sources = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    all_candidates: dict[str, list[dict]] = {"women": [], "men": []}
    seen: set[str] = set()
    per_cat_candidates: dict[str, dict[str, list[dict]]] = {
        "women": {},
        "men": {},
    }

    for gender in ("women", "men"):
        for cat in sources[gender]:
            cands = collect_subcategory(gender, cat, seen)
            per_cat_candidates[gender][cat["slug"]] = cands
            for c in cands:
                if c["id"] not in seen:
                    seen.add(c["id"])
                    all_candidates[gender].append(c)

    print(
        f"\nCandidates: women={len(all_candidates['women'])} men={len(all_candidates['men'])}"
    )

    # Round-robin selection: take up to PER_CATEGORY_TARGET per cat, then fill
    to_fetch: list[dict] = []
    selected_ids: set[str] = set()

    def take_from_cat(gender: str, slug: str, n: int) -> int:
        taken = 0
        for c in per_cat_candidates[gender].get(slug, []):
            if taken >= n:
                break
            if c["id"] in selected_ids:
                continue
            selected_ids.add(c["id"])
            to_fetch.append(c)
            taken += 1
        return taken

    # Phase 1: at least 2 per category when available
    for gender in ("women", "men"):
        for cat in sources[gender]:
            take_from_cat(gender, cat["slug"], 2)

    # Phase 2: up to PER_CATEGORY_TARGET per category
    for gender in ("women", "men"):
        for cat in sources[gender]:
            already = sum(
                1
                for x in to_fetch
                if x["category"] == gender and x["categorySlug"] == cat["slug"]
            )
            if already < PER_CATEGORY_TARGET:
                take_from_cat(gender, cat["slug"], PER_CATEGORY_TARGET - already)

    # Phase 3: fill to TARGET_PER_GENDER + buffer for PDP failures
    buffer = 15
    for gender in ("women", "men"):
        current = sum(1 for x in to_fetch if x["category"] == gender)
        need = TARGET_PER_GENDER + buffer - current
        if need <= 0:
            continue
        for c in all_candidates[gender]:
            if need <= 0:
                break
            if c["id"] in selected_ids:
                continue
            selected_ids.add(c["id"])
            to_fetch.append(c)
            need -= 1

    print(f"Will PDP-fetch {len(to_fetch)} products")

    products: list[dict] = []
    failures = 0
    fail_reasons: dict[str, int] = defaultdict(int)
    counts = {"women": 0, "men": 0}
    per_cat_final: dict[str, dict[str, int]] = {
        "women": defaultdict(int),
        "men": defaultdict(int),
    }

    for i, info in enumerate(to_fetch):
        gender = info["category"]
        if counts[gender] >= TARGET_PER_GENDER:
            continue

        url = BASE + info["path"]
        print(
            f"[{i+1}/{len(to_fetch)}] PDP {info['id']} ({gender}/{info['categorySlug']}) "
            f"~{info['price_cents']/100:.0f}€"
        )
        html = fetch(url)
        time.sleep(DELAY)
        if not html:
            failures += 1
            fail_reasons["fetch"] += 1
            continue
        try:
            prod = extract_pdp(html, info)
        except Exception as e:  # noqa: BLE001
            print(f"  parse error: {e}")
            failures += 1
            fail_reasons["parse"] += 1
            continue
        if not prod:
            failures += 1
            fail_reasons["empty_or_price"] += 1
            continue
        if prod["priceEur"] <= MIN_PRICE_EUR:
            failures += 1
            fail_reasons["price_filter"] += 1
            continue

        # Clean None materials
        obj: dict[str, Any] = {
            "id": prod["id"],
            "titleRu": prod["titleRu"],
            "brand": prod["brand"],
            "category": prod["category"],
            "categorySlug": prod["categorySlug"],
            "categoryNameRu": prod["categoryNameRu"],
            "priceEur": prod["priceEur"],
            "sizes": prod["sizes"],
            "imageUrl": prod["imageUrl"],
            "imageUrls": prod["imageUrls"],
            "descriptionRu": prod["descriptionRu"],
            "inStock": prod["inStock"],
        }
        if prod.get("priceEurWas") is not None:
            obj["priceEurWas"] = prod["priceEurWas"]
        if prod.get("material"):
            obj["material"] = prod["material"]
        if prod.get("materials"):
            obj["materials"] = prod["materials"]

        products.append(obj)
        counts[gender] += 1
        per_cat_final[gender][info["categorySlug"]] += 1
        print(f"  OK {prod['brand']} {prod['priceEur']}€ → {prod['titleRu'][:60]}")

        if counts["women"] >= TARGET_PER_GENDER and counts["men"] >= TARGET_PER_GENDER:
            print("Reached targets")
            break

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PRODUCTS_PATH.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    img_counts = [len(p["imageUrls"]) for p in products]
    avg_imgs = round(sum(img_counts) / len(img_counts), 2) if img_counts else 0
    stats = {
        "total": len(products),
        "women": counts["women"],
        "men": counts["men"],
        "min_price_eur": MIN_PRICE_EUR,
        "per_category": {
            "women": dict(per_cat_final["women"]),
            "men": dict(per_cat_final["men"]),
        },
        "image_count_avg": avg_imgs,
        "image_count_min": min(img_counts) if img_counts else 0,
        "image_count_max": max(img_counts) if img_counts else 0,
        "failures": failures,
        "fail_reasons": dict(fail_reasons),
        "candidates_women": len(all_candidates["women"]),
        "candidates_men": len(all_candidates["men"]),
        "brands": sorted({p["brand"] for p in products}),
        "with_description": sum(1 for p in products if p.get("descriptionRu")),
        "with_material": sum(1 for p in products if p.get("material")),
        "multiplier": 2.0,
        "delivery_rub": 2990,
    }
    STATS_PATH.write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("\n=== DONE ===")
    print(json.dumps(stats, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
