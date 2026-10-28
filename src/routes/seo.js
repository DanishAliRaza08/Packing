// sitemap.xml and robots.txt, generated from the page registry.
const express = require("express");
const { allPages } = require("../pages");
const { marketUrl } = require("../templating");

function createSeoRouter({ content }) {
  const router = express.Router();
  const domain = content.site.domain.replace(/\/$/, "");

  router.get("/sitemap.xml", (req, res) => {
    const seen = new Set();
    const entries = [];
    for (const market of ["us", "uk"]) {
      for (const p of allPages(market, content)) {
        const key = `${market}:${p.endpoint}:${JSON.stringify(p.args)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const alternates = Object.fromEntries(p.markets.map((m) => [m, domain + marketUrl(p.endpoint, m, p.args)]));
        entries.push({ loc: alternates[market], alternates });
      }
    }
    res.type("application/xml");
    res.render("sitemap.xml", { entries });
  });

  router.get("/robots.txt", (req, res) => {
    res.type("text/plain").send([
      "User-agent: *",
      "Disallow: /admin/",
      "Disallow: /api/",
      "Disallow: /uk/api/",
      "Disallow: /search/",
      "Disallow: /uk/search/",
      "Disallow: /thanks/",
      "Disallow: /uk/thanks/",
      "",
      `Sitemap: ${domain}/sitemap.xml`,
      "",
    ].join("\n"));
  });

  return router;
}

module.exports = { createSeoRouter };
