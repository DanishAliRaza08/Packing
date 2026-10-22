"""3D box designs for the Box Studio, loaded from content/designs.json."""

import json
from pathlib import Path

DESIGNS_FILE = Path(__file__).parent / "content" / "designs.json"

STYLES = {
    "mailer": "Mailer boxes",
    "shipping": "Shipping boxes",
    "tuck": "Product boxes",
    "rigid": "Rigid lid & base",
    "drawer": "Drawer boxes",
    "magnetic": "Magnetic boxes",
}

# Which 3D styles to show on each product page.
PRODUCT_STYLES = {
    "custom-mailer-boxes": ["mailer"],
    "custom-shipping-boxes": ["shipping"],
    "custom-product-boxes": ["tuck"],
    "rigid-gift-boxes": ["rigid", "magnetic", "drawer"],
    "packaging-add-ons": ["mailer"],
}

PATTERNS = [
    "solid", "stripes", "diagonal", "dots", "grid", "waves", "chevron", "checker", "terrazzo",
    "botanical", "confetti", "rays", "halftone", "triangles", "marble", "topo", "stars", "scallop",
]


def load_designs(path=DESIGNS_FILE):
    with open(path, encoding="utf-8") as f:
        designs = json.load(f)["designs"]
    for d in designs:
        if d["style"] not in STYLES:
            raise ValueError(f"Design {d['id']}: unknown style {d['style']}")
        if d["pattern"]["type"] not in PATTERNS:
            raise ValueError(f"Design {d['id']}: unknown pattern {d['pattern']['type']}")
    return designs


def by_style(designs, styles):
    return [d for d in designs if d["style"] in styles]


def by_niche(designs, niche):
    return [d for d in designs if niche in d["niches"]]


def find(designs, design_id):
    return next((d for d in designs if d["id"] == design_id), None)
