// 3D box designs for the Box Studio, loaded from content/designs.json.
const fs = require("fs");
const path = require("path");

const STYLES = {
  mailer: "Mailer boxes",
  shipping: "Shipping boxes",
  tuck: "Product boxes",
  rigid: "Rigid lid & base",
  drawer: "Drawer boxes",
  magnetic: "Magnetic boxes",
};

// Which 3D styles to show on each product page.
const PRODUCT_STYLES = {
  "custom-mailer-boxes": ["mailer"],
  "custom-shipping-boxes": ["shipping"],
  "custom-product-boxes": ["tuck"],
  "rigid-gift-boxes": ["rigid", "magnetic", "drawer"],
  "packaging-add-ons": ["mailer"],
};

const PATTERNS = [
  "solid", "stripes", "diagonal", "dots", "grid", "waves", "chevron", "checker", "terrazzo",
  "botanical", "confetti", "rays", "halftone", "triangles", "marble", "topo", "stars", "scallop",
];

function loadDesigns(file = path.join(__dirname, "content", "designs.json")) {
  const designs = JSON.parse(fs.readFileSync(file, "utf8")).designs;
  for (const d of designs) {
    if (!STYLES[d.style]) throw new Error(`Design ${d.id}: unknown style ${d.style}`);
    if (!PATTERNS.includes(d.pattern.type)) throw new Error(`Design ${d.id}: unknown pattern ${d.pattern.type}`);
  }
  return designs;
}

const byStyle = (designs, styles) => designs.filter((d) => styles.includes(d.style));
const byNiche = (designs, niche) => designs.filter((d) => d.niches.includes(niche));
const find = (designs, id) => designs.find((d) => d.id === id) || null;

module.exports = { STYLES, PRODUCT_STYLES, PATTERNS, loadDesigns, byStyle, byNiche, find };
