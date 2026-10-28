// Loads the editable content files in src/content/.
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "content");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));
}

function loadContent() {
  const catalog = readJson("catalog.json");
  const blog = readJson("blog.json");
  return {
    site: readJson("site.json"),
    pricing: readJson("pricing.json"),
    designs: require("./designs").loadDesigns(),
    catalog,
    blog,
    productsBySlug: Object.fromEntries(catalog.PRODUCTS.map((p) => [p.slug, p])),
    nichesBySlug: Object.fromEntries(catalog.NICHES.map((n) => [n.slug, n])),
    postsBySlug: Object.fromEntries(blog.POSTS.map((p) => [p.slug, p])),
  };
}

module.exports = { loadContent, readJson };
