#!/usr/bin/env python3
"""Scrape About You SK sale catalog into data/products.json."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
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
CATEGORIES = {
    "women": {
        "id": 32543,
        "path": "/c/zeny/vypredaj-32543",
        "target": 250,
    },
    "men": {
        "id": 32544,
        "path": "/c/muzi/vypredaj-32544",
        "target": 250,
    },
}
OUT_DIR = Path("/workspace/aboutyou-ru-sale/data")
PRODUCTS_PATH = OUT_DIR / "products.json"
STATS_PATH = OUT_DIR / "SCRAPE_STATS.json"
DELAY = 0.35
TIMEOUT = 25

TILE_RE = re.compile(
    r'"productTile":\{"productId":(\d+),"link":\{"url":"(/p/[^"]+)"'
)
PRICE_AFTER_TILE = re.compile(
    r'"price":\{"price":\{"amount":(\d+),"currencyCode":"EUR"\}'
)
STRIKE_RE = re.compile(
    r'"strikePrice":\{"amount":(\d+),"currencyCode":"EUR"\}'
)
BRAND_FILTER_RE = re.compile(r"[?&]brand=([a-z0-9-]+)")
SIZE_FILTER_RE = re.compile(r"[?&]categoryShopFilterSizes=(\d+)")
PATTERN_FILTER_RE = re.compile(r"[?&]pattern=(\d+)")
COLOR_FILTER_RE = re.compile(r"[?&](?:color|farba)=([a-z0-9-]+)", re.I)


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


def extract_tiles(html: str) -> list[dict[str, Any]]:
    """Extract product tiles with id, path, sale/strike prices."""
    products: list[dict[str, Any]] = []
    for m in TILE_RE.finditer(html):
        pid, path = m.group(1), m.group(2)
        # Look ahead in a window for price info belonging to this tile
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
    # Also grab bare productId + /p/ links that may not have full tiles
    # Prefer tiles; return tiles only (richer data)
    return products


def extract_product_ids_and_paths(html: str) -> list[tuple[str, str]]:
    """Fallback: collect (id, path) pairs from any /p/...-ID links."""
    pairs: list[tuple[str, str]] = []
    for path in re.findall(r'href="(/p/[^"]+)"', html):
        mid = re.search(r"-(\d+)$", path)
        if mid:
            pairs.append((mid.group(1), path))
    # Also from productId near links
    for m in re.finditer(
        r'"productId":(\d+).{0,200}?"url":"(/p/[^"]+)"', html, re.DOTALL
    ):
        pairs.append((m.group(1), m.group(2)))
    for m in re.finditer(
        r'"url":"(/p/[^"]+)".{0,200}?"productId":(\d+)', html, re.DOTALL
    ):
        pairs.append((m.group(2), m.group(1)))
    # dedupe preserve order
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for pid, path in pairs:
        if pid not in seen:
            seen.add(pid)
            out.append((pid, path))
    return out


def discover_filters(html: str) -> dict[str, list[str]]:
    return {
        "brand": sorted(set(BRAND_FILTER_RE.findall(html))),
        "size": sorted(set(SIZE_FILTER_RE.findall(html))),
        "pattern": sorted(set(PATTERN_FILTER_RE.findall(html))),
        "color": sorted(set(COLOR_FILTER_RE.findall(html))),
    }


def collect_category_products(category: str, meta: dict) -> dict[str, dict]:
    """Return dict keyed by product id with path + list prices."""
    collected: dict[str, dict] = {}
    base_path = meta["path"]
    target = meta["target"]

    def ingest_html(html: str, label: str) -> None:
        tiles = extract_tiles(html)
        for t in tiles:
            pid = t["id"]
            if pid not in collected:
                collected[pid] = {
                    "id": pid,
                    "path": t["path"],
                    "price_cents": t["price_cents"],
                    "strike_cents": t["strike_cents"],
                    "category": category,
                }
            else:
                # fill missing prices
                if collected[pid]["price_cents"] is None and t["price_cents"]:
                    collected[pid]["price_cents"] = t["price_cents"]
                if collected[pid]["strike_cents"] is None and t["strike_cents"]:
                    collected[pid]["strike_cents"] = t["strike_cents"]
        # fallback paths for ids without tiles
        for pid, path in extract_product_ids_and_paths(html):
            if pid not in collected:
                collected[pid] = {
                    "id": pid,
                    "path": path,
                    "price_cents": None,
                    "strike_cents": None,
                    "category": category,
                }
        print(f"  [{category}] after {label}: {len(collected)} unique")

    print(f"\n=== Collecting {category} base page ===")
    html = fetch(BASE + base_path)
    if not html:
        print(f"FAILED base page for {category}")
        return collected
    ingest_html(html, "base")
    filters = discover_filters(html)
    print(
        f"  filters: brands={len(filters['brand'])} sizes={len(filters['size'])} "
        f"patterns={len(filters['pattern'])} colors={len(filters['color'])}"
    )

    # Brand filters first (best variety)
    for brand in filters["brand"]:
        if len(collected) >= target * 2:  # gather extras for PDP failures
            break
        url = f"{BASE}{base_path}?brand={brand}"
        print(f"  fetch brand={brand}")
        h = fetch(url)
        time.sleep(0.25)
        if h:
            ingest_html(h, f"brand={brand}")
            # also harvest more brands from filtered page
            more = discover_filters(h)
            for b in more["brand"]:
                if b not in filters["brand"]:
                    filters["brand"].append(b)

    # Size filters
    for size in filters["size"]:
        if len(collected) >= target * 2:
            break
        url = f"{BASE}{base_path}?categoryShopFilterSizes={size}"
        print(f"  fetch size={size}")
        h = fetch(url)
        time.sleep(0.25)
        if h:
            ingest_html(h, f"size={size}")

    # Pattern filters
    for pattern in filters["pattern"]:
        if len(collected) >= target * 2:
            break
        url = f"{BASE}{base_path}?pattern={pattern}"
        print(f"  fetch pattern={pattern}")
        h = fetch(url)
        time.sleep(0.25)
        if h:
            ingest_html(h, f"pattern={pattern}")

    # Color filters
    for color in filters["color"]:
        if len(collected) >= target * 2:
            break
        url = f"{BASE}{base_path}?color={color}"
        print(f"  fetch color={color}")
        h = fetch(url)
        time.sleep(0.25)
        if h:
            ingest_html(h, f"color={color}")

    # Try page=2..5 even if may not work
    for page in range(2, 6):
        if len(collected) >= target * 2:
            break
        url = f"{BASE}{base_path}?page={page}"
        print(f"  fetch page={page}")
        h = fetch(url)
        time.sleep(0.25)
        if h:
            before = len(collected)
            ingest_html(h, f"page={page}")
            if len(collected) == before:
                print(f"  page={page} added 0 — stopping pagination")
                break

    # Brand + size combos for more coverage if still short
    if len(collected) < target * 1.5:
        for brand in filters["brand"][:15]:
            for size in filters["size"][:3]:
                if len(collected) >= target * 2:
                    break
                url = f"{BASE}{base_path}?brand={brand}&categoryShopFilterSizes={size}"
                print(f"  fetch brand={brand}&size={size}")
                h = fetch(url)
                time.sleep(0.2)
                if h:
                    ingest_html(h, f"brand={brand}&size={size}")

    return collected


def clean_image_url(url: str) -> str:
    # Strip query params for cleaner URLs; keep path
    return url.split("?")[0]


def extract_pdp(html: str, fallback: dict) -> dict[str, Any] | None:
    # Title
    title = None
    m = re.search(
        r'data-testid="productName"[^>]*>([^<]+)<', html
    )
    if m:
        title = m.group(1).strip()
    if not title:
        m = re.search(r'"productName"\s*:\s*"([^"]+)"', html)
        if m:
            title = m.group(1).strip()
    if not title:
        m = re.search(r"<h1[^>]*>([^<]+)</h1>", html)
        if m:
            title = m.group(1).strip()

    # Brand
    brand = None
    m = re.search(
        r'data-testid="brandNameContainer"[^>]*>([^<]+)<', html
    )
    if m:
        brand = m.group(1).strip()
    if not brand and title:
        # Often "BRAND Product name..."
        parts = title.split(" ", 1)
        if parts:
            brand = parts[0]

    # Images from structured "images":[{...}]
    image_urls: list[str] = []
    # Prefer structured product images block
    for m in re.finditer(
        r'"image":\{"src":"(https://cdn\.aboutstatic\.com/file/images/[^"]+)"',
        html,
    ):
        u = clean_image_url(m.group(1))
        # Filter tiny icons/logos: prefer jpg/png product hashes; skip very short
        if "/file/images/" not in u:
            continue
        # skip known non-product patterns if any
        if u not in image_urls:
            image_urls.append(u)

    # Fallback: any cdn hash images
    if len(image_urls) < 2:
        for u in re.findall(
            r'https://cdn\.aboutstatic\.com/file/images/[a-f0-9]{32}\.(?:jpg|jpeg|png|webp)',
            html,
            re.I,
        ):
            u = clean_image_url(u)
            if u not in image_urls:
                image_urls.append(u)

    # Sizes with quantity > 0
    sizes: list[str] = []
    for m in re.finditer(
        r'"quantity":(\d+),"vendorSize":\{"size":\{"\$case":"singleDimension",'
        r'"singleDimension":\{"dimension":"([^"]+)"\}\}',
        html,
    ):
        qty, dim = int(m.group(1)), m.group(2)
        if qty > 0 and dim not in sizes:
            sizes.append(dim)
    # dual dimension e.g. waist/length
    for m in re.finditer(
        r'"quantity":(\d+),"vendorSize":\{"size":\{"\$case":"([^"]+)","\2":\{([^}]+)\}\}',
        html,
    ):
        pass  # handled below more generally

    # More general: dimension fields near quantity
    if not sizes:
        # Find sizes arrays chunks
        for block in re.finditer(r'"sizes":\[(.*?)\]', html, re.DOTALL):
            chunk = block.group(1)[:8000]
            for sm in re.finditer(
                r'"quantity":(\d+).{0,300}?"dimension":"([^"]+)"', chunk, re.DOTALL
            ):
                if int(sm.group(1)) > 0 and sm.group(2) not in sizes:
                    sizes.append(sm.group(2))
            # Also try size label fields
            for sm in re.finditer(
                r'"quantity":(\d+).{0,200}?"label":"([^"]+)"', chunk, re.DOTALL
            ):
                if int(sm.group(1)) > 0 and sm.group(2) not in sizes:
                    sizes.append(sm.group(2))
            if sizes:
                break

    # Price from sizes[0] or tracker
    price_cents = fallback.get("price_cents")
    strike_cents = fallback.get("strike_cents")
    m = re.search(
        r'"withTax":(\d+),"tax":\d+,"currencyCode":"EUR"', html
    )
    if m:
        price_cents = int(m.group(1))
    m = re.search(
        r'"campaignReduction":\{"priceBeforeWithTax":(\d+)', html
    )
    if m:
        strike_cents = int(m.group(1))
    else:
        m = re.search(
            r'"saleReduction":\{"priceBeforeWithTax":(\d+)', html
        )
        if m and strike_cents is None:
            strike_cents = int(m.group(1))

    if not title:
        return None
    if price_cents is None:
        return None
    if not image_urls:
        # try any aboutstatic image
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

    in_stock = len(sizes) > 0 or True  # if no size info, assume in stock on sale

    price_eur = cents_to_eur(price_cents)
    was = cents_to_eur(strike_cents)
    # If was equals or below sale, drop was
    if was is not None and price_eur is not None and was <= price_eur:
        was = None

    return {
        "id": fallback["id"],
        "titleRu": title,  # Slovak as-is per instructions
        "brand": brand or "UNKNOWN",
        "category": fallback["category"],
        "priceEur": price_eur,
        "priceEurWas": was,
        "sizes": sizes,
        "imageUrl": image_urls[0] if image_urls else "",
        "imageUrls": image_urls,
        "inStock": bool(sizes) if sizes else True,
    }


def main() -> None:
    all_candidates: dict[str, dict] = {}
    for cat, meta in CATEGORIES.items():
        collected = collect_category_products(cat, meta)
        for pid, info in collected.items():
            # Prefer first category if duplicate across genders (unlikely)
            if pid not in all_candidates:
                all_candidates[pid] = info

    print(f"\nTotal unique candidates: {len(all_candidates)}")

    # Cap per category for PDP fetch
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for info in all_candidates.values():
        by_cat[info["category"]].append(info)

    to_fetch: list[dict] = []
    for cat, meta in CATEGORIES.items():
        items = by_cat[cat]
        # Prefer ones with prices (full tiles)
        items.sort(key=lambda x: (0 if x.get("price_cents") else 1, x["id"]))
        # Overfetch a bit for failures
        take = min(len(items), meta["target"] + 40)
        to_fetch.extend(items[:take])
        print(f"{cat}: {len(items)} candidates, will PDP-fetch {take}")

    products: list[dict] = []
    failures = 0
    fail_reasons: dict[str, int] = defaultdict(int)
    women_n = men_n = 0
    targets = {c: CATEGORIES[c]["target"] for c in CATEGORIES}

    for i, info in enumerate(to_fetch):
        cat = info["category"]
        if cat == "women" and women_n >= targets["women"]:
            continue
        if cat == "men" and men_n >= targets["men"]:
            continue

        url = BASE + info["path"]
        print(f"[{i+1}/{len(to_fetch)}] PDP {info['id']} ({cat}) {info['path']}")
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
            fail_reasons["empty"] += 1
            continue
        if not prod.get("imageUrl"):
            failures += 1
            fail_reasons["no_image"] += 1
            continue

        products.append(prod)
        if cat == "women":
            women_n += 1
        else:
            men_n += 1

        if women_n >= targets["women"] and men_n >= targets["men"]:
            print("Reached targets for both categories")
            break

    # Ensure priceEurWas key omitted when None for cleaner JSON? Keep null or omit
    cleaned = []
    for p in products:
        obj = {
            "id": p["id"],
            "titleRu": p["titleRu"],
            "brand": p["brand"],
            "category": p["category"],
            "priceEur": p["priceEur"],
            "sizes": p["sizes"],
            "imageUrl": p["imageUrl"],
            "imageUrls": p["imageUrls"],
            "inStock": p["inStock"],
        }
        if p.get("priceEurWas") is not None:
            obj["priceEurWas"] = p["priceEurWas"]
        # Keep field order closer to schema: insert priceEurWas after priceEur
        if "priceEurWas" in obj:
            ordered = {
                "id": obj["id"],
                "titleRu": obj["titleRu"],
                "brand": obj["brand"],
                "category": obj["category"],
                "priceEur": obj["priceEur"],
                "priceEurWas": obj["priceEurWas"],
                "sizes": obj["sizes"],
                "imageUrl": obj["imageUrl"],
                "imageUrls": obj["imageUrls"],
                "inStock": obj["inStock"],
            }
            cleaned.append(ordered)
        else:
            cleaned.append(obj)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PRODUCTS_PATH.write_text(
        json.dumps(cleaned, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    img_counts = [len(p["imageUrls"]) for p in cleaned]
    avg_imgs = round(sum(img_counts) / len(img_counts), 2) if img_counts else 0
    stats = {
        "total": len(cleaned),
        "women": sum(1 for p in cleaned if p["category"] == "women"),
        "men": sum(1 for p in cleaned if p["category"] == "men"),
        "image_count_avg": avg_imgs,
        "image_count_min": min(img_counts) if img_counts else 0,
        "image_count_max": max(img_counts) if img_counts else 0,
        "failures": failures,
        "fail_reasons": dict(fail_reasons),
        "candidates_total": len(all_candidates),
        "candidates_women": len(by_cat["women"]),
        "candidates_men": len(by_cat["men"]),
        "brands": sorted({p["brand"] for p in cleaned}),
        "pagination_note": (
            "SSR exposes ~30 full tiles / ~170 ids per page; "
            "?page= often does not paginate. Coverage via brand/size/pattern/color filters."
        ),
    }
    STATS_PATH.write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("\n=== DONE ===")
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    if cleaned:
        print("sample:", json.dumps(cleaned[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
