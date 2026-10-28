// Nunjucks setup: URL building for the US (/) and UK (/uk/) sites, filters, and per-request template values.
const path = require("path");
const nunjucks = require("nunjucks");
const { CM_PER_INCH } = require("./pricing");
const { STYLES: DESIGN_STYLES } = require("./designs");
const { HONEYPOT_FIELD, csrfToken } = require("./security");

const MARKETS = ["us", "uk"];

// Every public page, by name. The UK site adds /uk in front.
const SITE_ROUTES = {
  home: "/",
  studio: "/box-studio/",
  pricing: "/pricing/",
  how_it_works: "/how-it-works/",
  eco: "/eco-materials/",
  about: "/about/",
  faq: "/faq/",
  blog: "/blog/",
  blog_post: "/blog/:slug/",
  privacy: "/privacy-policy/",
  terms: "/terms-of-sale/",
  cookies: "/cookie-policy/",
  shipping: "/shipping-returns/",
  search: "/search/",
  quote: "/quote/",
  samples: "/samples/",
  contact: "/contact/",
  thanks: "/thanks/:kind/",
  api_estimate: "/api/estimate",
  niche: "/packaging-for-:slug/",
  product: "/:slug/",
};

const ADMIN_ROUTES = {
  login: "/admin/login",
  logout: "/admin/logout",
  index: "/admin/",
  detail: "/admin/quote/:quote_id",
  artwork: "/admin/quote/:quote_id/artwork",
  export_csv: "/admin/export.csv",
};

function buildUrl(pattern, params = {}) {
  const rest = { ...params };
  delete rest.__keywords;
  const pathPart = pattern.replace(/:([a-z_]+)/g, (_, name) => {
    const value = rest[name];
    delete rest[name];
    return encodeURIComponent(value);
  });
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) if (v !== undefined && v !== null) query.append(k, v);
  const qs = query.toString();
  return qs ? `${pathPart}?${qs}` : pathPart;
}

function marketUrl(endpoint, market, params) {
  const pattern = SITE_ROUTES[endpoint];
  if (!pattern) throw new Error(`Unknown page: ${endpoint}`);
  return (market === "uk" ? "/uk" : "") + buildUrl(pattern, params);
}

function urlFor(endpoint, params = {}) {
  if (endpoint === "static") return `/static/${params.filename}`;
  const [prefix, name] = endpoint.includes(".") ? endpoint.split(".") : [null, endpoint];
  if (prefix === "admin") return buildUrl(ADMIN_ROUTES[name], params);
  return marketUrl(name, prefix || "us", params);
}

function fill(text, site) {
  return text
    .replaceAll("{min}", String(site.min_units))
    .replaceAll("{hours}", String(site.mockup_hours))
    .replaceAll("{days}", site.production_days)
    .replaceAll("{custom_from}", site.free_custom_sizing_from.toLocaleString("en-US"));
}

function localise(value, market, site) {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((k) => MARKETS.includes(k))) {
    value = value[market] ?? value.us;
  }
  return typeof value === "string" ? fill(value, site) : value;
}

function formatMoney(amount, market, pricing) {
  const symbol = pricing.markets[market].symbol;
  return symbol + Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const trimNumber = (n) => String(Number(n.toFixed(2)));

function formatDims(dimsIn, market) {
  if (market === "uk") return `${dimsIn.map((d) => trimNumber(Math.round(d * CM_PER_INCH * 2) / 2)).join(" × ")} cm`;
  return `${dimsIn.map(trimNumber).join(" × ")} in`;
}

// JSON safe to place inside a <script> tag.
function scriptJson(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/'/g, "\\u0027");
}

// Read-only view of submitted form or query values, with the get/getlist the templates use.
class FormView {
  constructor(values = {}) {
    this.values = values || {};
  }

  get(key, fallback = "") {
    const v = this.values[key];
    if (v === undefined || v === null) return fallback;
    return Array.isArray(v) ? v[0] : v;
  }

  getlist(key) {
    const v = this.values[key];
    if (v === undefined || v === null || v === "") return [];
    return Array.isArray(v) ? v : [v];
  }
}

// Field errors for a form. Templates use errors.get(name), errors.any() and errors.values().
class ErrorBag {
  constructor() {
    this.items = {};
  }

  set(key, message) {
    this.items[key] = message;
  }

  get(key) {
    return this.items[key] || "";
  }

  any() {
    return Object.keys(this.items).length > 0;
  }

  values() {
    return Object.values(this.items);
  }
}

function createEnv(app, content) {
  const env = nunjucks.configure(path.join(__dirname, "..", "views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV === "development",
  });
  const { site } = content;

  env.addFilter("m", function (value) {
    return localise(value, this.ctx.market || "us", site);
  });
  env.addFilter("title", (title) => {
    const full = `${title} | ${site.brand_name}`;
    return full.length <= 60 ? full : title;
  });
  env.addFilter("slugify", (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  env.addFilter("nl2br", (text) => {
    const escaped = nunjucks.lib.escape(String(text || ""));
    return new nunjucks.runtime.SafeString(escaped.split("\n").join("<br>"));
  });
  env.addFilter("json_ld", (data) => new nunjucks.runtime.SafeString(JSON.stringify(data).replace(/<\//g, "<\\/")));
  env.addFilter("tojson", (data) => new nunjucks.runtime.SafeString(scriptJson(data)));
  env.addFilter("commas", (n) => Number(n).toLocaleString("en-US"));
  env.addFilter("fixed", (n, digits = 2) => Number(n).toFixed(digits));
  return env;
}

// Values every template can use. Set on res.locals for each request.
function templateLocals(req, res, content) {
  const { site, pricing, designs, catalog } = content;
  const currentPath = req.originalUrl.split("?")[0];
  // The UK site lives under /uk/; everything else (including 404s) follows the URL prefix.
  const market = currentPath === "/uk" || currentPath.startsWith("/uk/") ? "uk" : "us";
  const domain = site.domain.replace(/\/$/, "");
  const absolute = (p) => domain + p;
  const isSitePage = () => Boolean(res.locals.endpoint);
  const available = () => res.locals.markets_available || MARKETS;
  const pagePath = (mkt) => marketUrl(res.locals.endpoint, mkt, res.locals.viewArgs || {});

  function link(endpoint, ...args) {
    let mkt = market;
    let params = {};
    for (const a of args) {
      if (a && typeof a === "object") params = a;
      else if (typeof a === "string") mkt = a;
    }
    return marketUrl(endpoint, mkt, params);
  }

  const niches = [site.main_niche, ...site.secondary_niches]
    .map((slug) => catalog.NICHES.find((n) => n.slug === slug))
    .filter(Boolean);

  return {
    market,
    t: catalog.LOCALE[market],
    site,
    pricing_cfg: pricing,
    request: { path: currentPath, args: new FormView(req.query) },
    session: new FormView(req.session || {}),
    link,
    url_for: (endpoint, params) => urlFor(endpoint, params),
    absolute,
    alternate: (mkt) => (isSitePage() && available().includes(mkt) ? absolute(pagePath(mkt)) : null),
    switch_url: (mkt) => (isSitePage() && available().includes(mkt) ? pagePath(mkt) : marketUrl("home", mkt)),
    crumbs_ld: (crumbs) => crumbs.map(([label, url], i) => ({
      "@type": "ListItem", position: i + 1, name: label, item: absolute(url || currentPath),
    })),
    faq_ld: (faqs) => faqs.map(([q, a]) => ({
      "@type": "Question", name: localise(q, market, site),
      acceptedAnswer: { "@type": "Answer", text: localise(a, market, site) },
    })),
    csrf_token: () => csrfToken(req.session),
    honeypot: HONEYPOT_FIELD,
    money: (amount, mkt) => formatMoney(amount, mkt || market, pricing),
    dims: (d, mkt) => formatDims(d, mkt || market),
    today: new Date().toISOString().slice(0, 10),
    year: new Date().getFullYear(),
    design_count: designs.length,
    design_styles: DESIGN_STYLES,
    main_niche: content.nichesBySlug[site.main_niche],
    nav_products: catalog.PRODUCTS,
    nav_niches: niches,
  };
}

module.exports = {
  MARKETS, SITE_ROUTES, ADMIN_ROUTES, buildUrl, marketUrl, urlFor, localise, formatMoney, formatDims,
  FormView, ErrorBag, createEnv, templateLocals,
};
