"""Instant price estimator. All numbers come from content/pricing.json."""

import json
from pathlib import Path

PRICING_FILE = Path(__file__).parent / "content" / "pricing.json"
CM_PER_INCH = 2.54


class EstimateError(ValueError):
    pass


def load_pricing(path=PRICING_FILE):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _surface_area(dims):
    length, width, height = dims
    return 2 * (length * width + length * height + width * height)


def size_factor(dims_in, cfg):
    ratio = _surface_area(dims_in) / _surface_area(cfg["reference_size_in"])
    factor = ratio ** cfg["size_exponent"]
    return min(max(factor, cfg["size_factor_min"]), cfg["size_factor_max"])


def tier_for(qty, cfg):
    tiers = sorted(cfg["quantity_tiers"], key=lambda t: t["min"])
    chosen = None
    for tier in tiers:
        if qty >= tier["min"]:
            chosen = tier
    if chosen is None:
        raise EstimateError(f"Minimum order is {tiers[0]['min']} boxes.")
    return chosen


def estimate(style, dims, qty, material=None, sides="outside", market="us", unit=None, cfg=None):
    """Return an estimated price range per box and in total, in the market's currency.

    dims are (length, width, height) in `unit` ("in" or "cm"); the default unit
    is the market's own (inches for US, centimetres for UK).
    """
    cfg = cfg or load_pricing()
    if market not in cfg["markets"]:
        raise EstimateError("Unknown market.")
    mkt = cfg["markets"][market]
    unit = unit or mkt["unit"]

    style_cfg = cfg["styles"].get(style)
    if not style_cfg:
        raise EstimateError("Choose a box style.")
    material = material or style_cfg["materials"][0]
    if material not in style_cfg["materials"]:
        raise EstimateError("That material isn't available for this box style.")
    if sides not in cfg["print_sides"]:
        raise EstimateError("Choose print sides.")

    try:
        qty = int(qty)
        dims = [float(d) for d in dims]
    except (TypeError, ValueError):
        raise EstimateError("Enter numbers for size and quantity.")
    if len(dims) != 3 or any(d <= 0 for d in dims):
        raise EstimateError("Enter length, width and height.")
    dims_in = [d / CM_PER_INCH for d in dims] if unit == "cm" else dims
    if max(dims_in) > cfg["max_dimension_in"]:
        raise EstimateError("That's larger than our estimator covers. Request a quote instead.")
    if qty < style_cfg["min_qty"]:
        raise EstimateError(f"Minimum order for this style is {style_cfg['min_qty']} boxes.")

    tier = tier_for(qty, cfg)
    multiplier = (
        style_cfg["factor"]
        * cfg["materials"][material]["factor"]
        * cfg["print_sides"][sides]["factor"]
        * size_factor(dims_in, cfg)
        * mkt["rate"]
    )
    low = round(tier["low"] * multiplier, 2)
    high = round(tier["high"] * multiplier, 2)
    return {
        "currency": mkt["code"],
        "symbol": mkt["symbol"],
        "qty": qty,
        "per_box_low": low,
        "per_box_high": high,
        "total_low": round(low * qty, 2),
        "total_high": round(high * qty, 2),
    }


def from_price_table(style, market="us", cfg=None):
    """'From' prices at each table quantity: reference size, default material, printed outside."""
    cfg = cfg or load_pricing()
    style_cfg = cfg["styles"][style]
    ref = cfg["reference_size_in"]
    rows = []
    for qty in cfg["table_quantities"]:
        if qty < style_cfg["min_qty"]:
            continue
        est = estimate(style, ref, qty, sides="outside", market=market, unit="in", cfg=cfg)
        rows.append(est)
    return rows


def lowest_price(style, market="us", cfg=None):
    rows = from_price_table(style, market, cfg)
    return min(r["per_box_low"] for r in rows), max(r["per_box_high"] for r in rows)
