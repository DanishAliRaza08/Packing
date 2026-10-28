// Public pages. One router per market: US at /, UK at /uk/.
const express = require("express");
const { EstimateError, estimate, fromPriceTable, lowestPrice } = require("../pricing");
const { PRODUCT_STYLES, STYLES: DESIGN_STYLES, byNiche, byStyle, find } = require("../designs");
const { STATIC_PAGES, allPages } = require("../pages");
const { ErrorBag, FormView, localise, marketUrl } = require("../templating");
const { HttpError, UploadError, checkCsrf, isBot, saveUpload } = require("../security");

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SOURCES = ["Google search", "Instagram", "LinkedIn", "Etsy or Shopify community", "Referral from a friend", "Other"];
const COLOUR_OPTIONS = ["One colour", "Two colours", "Full colour (CMYK)"];
const LEGAL = { privacy: "/privacy-policy/", terms: "/terms-of-sale/", cookies: "/cookie-policy/", shipping: "/shipping-returns/" };
const THANKS_EVENTS = { quote: "quote_submitted", sample: "sample_requested", contact: "contact_submitted" };

// Pick designs round-robin across styles so a short strip shows variety.
function showcase(designs, count) {
  const buckets = new Map();
  for (const d of designs) {
    if (!buckets.has(d.style)) buckets.set(d.style, []);
    buckets.get(d.style).push(d);
  }
  const picked = [];
  while (picked.length < count && [...buckets.values()].some((b) => b.length)) {
    for (const bucket of buckets.values()) if (bucket.length && picked.length < count) picked.push(bucket.shift());
  }
  return picked;
}

const unique = (designs) => [...new Map(designs.map((d) => [d.id, d])).values()];

function createSiteRouter(market, ctx) {
  const { content, config, store, limiter, sendEmail, upload } = ctx;
  const { site, pricing, designs, catalog } = content;
  const router = express.Router({ strict: true });
  const L = (value) => localise(value, market, site);
  const url = (endpoint, params) => marketUrl(endpoint, market, params);
  const pageMeta = (endpoint) => ({ title: L(STATIC_PAGES[endpoint][0]), description: L(STATIC_PAGES[endpoint][1]) });
  const breadcrumbs = (...items) => [["Home", url("home")], ...items];

  // Register a page: remembers its name so templates can build hreflang and US/UK switch links.
  function page(method, endpoint, path, ...handlers) {
    router[method](path, (req, res, next) => {
      res.locals.endpoint = endpoint;
      res.locals.viewArgs = { ...req.params };
      next();
    }, ...handlers);
  }

  // ------------------------------------------------------------ core pages

  page("get", "home", "/", (req, res) => {
    const niches = [site.main_niche, ...site.secondary_niches].map((s) => content.nichesBySlug[s]).filter(Boolean);
    const faqs = catalog.FAQ_GROUPS.flatMap(([, group]) => group).slice(0, catalog.HOME_FAQ_COUNT);
    const fromPrices = {};
    for (const p of catalog.PRODUCTS) if (p.style) fromPrices[p.slug] = lowestPrice(p.style, market, pricing)[0];
    const hero = find(designs, site.hero_design) || designs[0];
    const strip = showcase(designs.filter((d) => d.id !== hero.id), 12);
    const productDesigns = Object.fromEntries(Object.entries(PRODUCT_STYLES).map(([slug, styles]) => [slug, byStyle(designs, styles)[0]]));
    res.render("home.html", {
      meta: pageMeta("home"), niche: content.nichesBySlug[site.main_niche], niches, products: catalog.PRODUCTS,
      from_prices: fromPrices, steps: catalog.HOW_IT_WORKS, trust: catalog.TRUST_POINTS, faqs,
      hero_design: hero, strip, product_designs: productDesigns,
      designs3d: unique([hero, ...strip, ...Object.values(productDesigns)]),
    });
  });

  page("get", "studio", "/box-studio/", (req, res) => {
    res.render("studio.html", {
      meta: pageMeta("studio"), designs, designs3d: designs,
      niches: catalog.NICHES.filter((n) => byNiche(designs, n.slug).length), styles: DESIGN_STYLES,
      initial: site.hero_design || designs[0].id, crumbs: breadcrumbs(["3D Box Studio", null]),
    });
  });

  page("get", "pricing", "/pricing/", (req, res) => {
    const styles = Object.keys(pricing.styles).map((k) => [k, L(catalog.STYLE_LABELS[k]), pricing.styles[k]]);
    const tables = Object.fromEntries(Object.keys(pricing.styles).map((k) => [k, fromPriceTable(k, market, pricing)]));
    res.render("pricing.html", {
      meta: pageMeta("pricing"), styles, tables, material_labels: catalog.MATERIAL_LABELS,
      print_labels: catalog.PRINT_LABELS, crumbs: breadcrumbs(["Price estimator", null]),
    });
  });

  page("get", "how_it_works", "/how-it-works/", (req, res) => {
    res.render("how_it_works.html", { meta: pageMeta("how_it_works"), steps: catalog.HOW_IT_WORKS, crumbs: breadcrumbs(["How it works", null]) });
  });

  page("get", "eco", "/eco-materials/", (req, res) => {
    res.render("eco.html", { meta: pageMeta("eco"), materials: catalog.MATERIAL_LABELS, crumbs: breadcrumbs(["Eco materials", null]) });
  });

  page("get", "about", "/about/", (req, res) => {
    res.render("about.html", { meta: pageMeta("about"), crumbs: breadcrumbs(["About", null]) });
  });

  page("get", "faq", "/faq/", (req, res) => {
    res.render("faq.html", { meta: pageMeta("faq"), groups: catalog.FAQ_GROUPS, crumbs: breadcrumbs(["FAQ", null]) });
  });

  page("get", "blog", "/blog/", (req, res) => {
    const posts = content.blog.POSTS.filter((p) => p.markets.includes(market));
    res.render("blog/index.html", { meta: pageMeta("blog"), posts, crumbs: breadcrumbs(["Blog", null]) });
  });

  page("get", "blog_post", "/blog/:slug/", (req, res, next) => {
    const post = content.postsBySlug[req.params.slug];
    if (!post || !post.markets.includes(market)) return next();
    res.locals.markets_available = post.markets;
    const related = content.blog.POSTS.filter((p) => p.slug !== post.slug && p.markets.includes(market)).slice(0, 3);
    res.render(`blog/posts/${post.slug}.html`, {
      post, author: content.blog.AUTHOR, related, product: content.productsBySlug[post.product],
      mailer_table: fromPriceTable("mailer", market, pricing), shipping_table: fromPriceTable("shipping", market, pricing),
      meta: { title: L(post.title), description: L(post.description) },
      crumbs: breadcrumbs(["Blog", url("blog")], [L(post.title), null]),
    });
  });

  for (const [name, path] of Object.entries(LEGAL)) {
    page("get", name, path, (req, res) => {
      const meta = pageMeta(name);
      res.render(`legal/${name}.html`, { meta, crumbs: breadcrumbs([meta.title, null]) });
    });
  }

  page("get", "search", "/search/", (req, res) => {
    const q = String(req.query.q || "").trim().slice(0, 200);
    let results = [];
    if (q) {
      const words = q.toLowerCase().split(/\W+/).filter(Boolean);
      for (const p of allPages(market, content)) {
        const text = `${L(p.title)} ${L(p.description)}`.toLowerCase();
        const score = words.reduce((sum, w) => sum + text.split(w).length - 1, 0);
        if (score) results.push([score, L(p.title), L(p.description), url(p.endpoint, p.args)]);
      }
      results = results.sort((a, b) => b[0] - a[0]);
    }
    res.render("search.html", { q, results, meta: { title: "Search", description: "Search the site." }, noindex: true });
  });

  // ------------------------------------------------------------ forms

  const clean = (body, name, limit = 200) => String(new FormView(body).get(name, "")).trim().slice(0, limit);
  const number = (body, name) => {
    const v = parseFloat(new FormView(body).get(name, ""));
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  function contactFields(body, errors) {
    const data = {
      name: clean(body, "name", 120), company: clean(body, "company", 120), email: clean(body, "email", 200),
      phone: clean(body, "phone", 40), country: clean(body, "country", 40), postcode: clean(body, "postcode", 20),
      message: clean(body, "message", 4000), source: clean(body, "source", 60),
    };
    if (!data.name) errors.set("name", "Please enter your name.");
    if (!EMAIL_RE.test(data.email)) errors.set("email", "Please enter a valid email address.");
    if (clean(body, "consent") !== "yes") errors.set("consent", "Please agree to the privacy policy so we can reply.");
    return data;
  }

  function notify(id, data) {
    const owner = config.notifyEmail || site.contact.email;
    const lines = Object.entries(data).filter(([k, v]) => k !== "ip" && v !== null && v !== "" && v !== 0).map(([k, v]) => `${k}: ${v}`);
    const firstName = data.name ? data.name.split(/\s+/)[0] : "there";
    const mockup = data.kind === "quote" ? `, with your free 3D mockup within ${site.mockup_hours} hours.` : ".";
    // Emails are sent in the background so the visitor doesn't wait for the mail server.
    sendEmail(owner, `New ${data.kind} request #${id} from ${data.name}`, lines.join("\n"), data.email);
    sendEmail(
      data.email, `We got your request — ${site.brand_name}`,
      `Hi ${firstName},\n\nThanks for your ${data.kind} request (reference #${id}). ${site.team.lead_name} will reply within a few business hours${mockup}`
      + `\n\nIf you need us sooner, reply to this email or message us on WhatsApp.\n\n${site.team.lead_name}\n${site.brand_name}\n${site.contact.email}`,
    );
  }

  function finish(req, res, kind, data) {
    Object.assign(data, { kind, market, ip: req.ip });
    const id = store.createQuote(data);
    notify(id, data);
    res.redirect(url("thanks", { kind }));
  }

  // Common checks for every form. Returns true when the request was already answered.
  function guard(req, res) {
    checkCsrf(req);
    if (isBot(req)) {
      res.redirect(url("thanks", { kind: "quote" }));
      return true;
    }
    if (!limiter.allow(`forms:${req.ip}`, config.rateLimitCount, config.rateLimitWindow)) {
      res.status(429).render("error.html", { message: "Too many requests. Please wait a few minutes or email us." });
      return true;
    }
    return false;
  }

  function renderQuote(res, form, errors) {
    res.status(errors.any() ? 400 : 200).render("quote.html", {
      meta: pageMeta("quote"), errors, form,
      styles: Object.keys(catalog.STYLE_LABELS).map((k) => [k, L(catalog.STYLE_LABELS[k])]),
      materials: catalog.MATERIAL_LABELS, print_labels: catalog.PRINT_LABELS, colours: COLOUR_OPTIONS,
      finishes: catalog.FINISHES, sources: SOURCES, crumbs: breadcrumbs(["Get a quote", null]),
    });
  }

  page("get", "quote", "/quote/", (req, res) => renderQuote(res, new FormView(req.query), new ErrorBag()));

  page("post", "quote", "/quote/", upload, (req, res) => {
    if (guard(req, res)) return;
    const body = req.body;
    const errors = new ErrorBag();
    const data = contactFields(body, errors);
    const style = clean(body, "style", 20);
    if (![...Object.keys(catalog.STYLE_LABELS), "addons", "not-sure"].includes(style)) errors.set("style", "Please choose a box style.");
    const qty = number(body, "quantity");
    if (!qty || qty < 50) errors.set("quantity", "Please enter a quantity of at least 50.");
    const finishNames = catalog.FINISHES.map(([n]) => n);
    const finishes = new FormView(body).getlist("finishes").filter((f) => finishNames.includes(f));
    Object.assign(data, {
      style, length: number(body, "length"), width: number(body, "width"), height: number(body, "height"),
      unit: market === "uk" ? "cm" : "in", quantity: Math.trunc(qty || 0),
      material: clean(body, "material", 30), print_sides: clean(body, "print_sides", 20),
      colours: clean(body, "colours", 40), finishes: finishes.join(", "),
      design_help: clean(body, "design_help") === "yes" ? 1 : 0,
      deadline: clean(body, "deadline", 20), design: clean(body, "design", 400),
    });
    if (!errors.any()) {
      try {
        [data.artwork_name, data.artwork_file] = saveUpload(req.file, config.uploadDir);
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        errors.set("artwork", err.message);
      }
    }
    if (errors.any()) return renderQuote(res, new FormView(body), errors);
    if (data.length && data.width && data.height && pricing.styles[style]) {
      try {
        const est = estimate({
          style, dims: [data.length, data.width, data.height], qty: data.quantity,
          material: data.material || undefined, sides: data.print_sides || "outside", market,
        }, pricing);
        Object.assign(data, { estimate_low: est.total_low, estimate_high: est.total_high, currency: est.currency });
      } catch (err) {
        if (!(err instanceof EstimateError)) throw err;
      }
    }
    finish(req, res, "quote", data);
  });

  function renderSamples(res, form, errors) {
    res.status(errors.any() ? 400 : 200).render("samples.html", {
      meta: pageMeta("samples"), errors, form, materials: catalog.MATERIAL_LABELS, crumbs: breadcrumbs(["Samples", null]),
    });
  }

  page("get", "samples", "/samples/", (req, res) => renderSamples(res, new FormView({}), new ErrorBag()));
  page("post", "samples", "/samples/", (req, res) => {
    if (guard(req, res)) return;
    const errors = new ErrorBag();
    const data = contactFields(req.body, errors);
    data.material = new FormView(req.body).getlist("samples").filter((m) => m in catalog.MATERIAL_LABELS).join(", ");
    if (!data.material) errors.set("samples", "Please choose at least one sample.");
    if (errors.any()) return renderSamples(res, new FormView(req.body), errors);
    finish(req, res, "sample", data);
  });

  function renderContact(res, form, errors) {
    res.status(errors.any() ? 400 : 200).render("contact.html", {
      meta: pageMeta("contact"), errors, form, crumbs: breadcrumbs(["Contact", null]),
    });
  }

  page("get", "contact", "/contact/", (req, res) => renderContact(res, new FormView({}), new ErrorBag()));
  page("post", "contact", "/contact/", (req, res) => {
    if (guard(req, res)) return;
    const errors = new ErrorBag();
    const data = contactFields(req.body, errors);
    if (!data.message) errors.set("message", "Please write a short message.");
    if (errors.any()) return renderContact(res, new FormView(req.body), errors);
    finish(req, res, "contact", data);
  });

  page("get", "thanks", "/thanks/:kind/", (req, res, next) => {
    const kind = req.params.kind;
    if (!THANKS_EVENTS[kind]) return next();
    res.render("thanks.html", {
      kind, event: THANKS_EVENTS[kind], noindex: true, meta: { title: "Thank you", description: "We received your request." },
    });
  });

  router.post("/api/estimate", express.json({ limit: "10kb" }), (req, res) => {
    const body = req.body || {};
    try {
      const est = estimate({
        style: body.style, dims: [body.length, body.width, body.height], qty: body.quantity,
        material: body.material || undefined, sides: body.sides || "outside", market,
      }, pricing);
      const money = (n) => res.locals.money(n);
      res.json({
        ...est, ok: true,
        per_box: `${money(est.per_box_low)}–${money(est.per_box_high)}`,
        total: `${money(est.total_low)}–${money(est.total_high)}`,
      });
    } catch (err) {
      if (!(err instanceof EstimateError)) throw err;
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // Industry and product pages come last because they match any /<slug>/ path.
  page("get", "niche", "/packaging-for-:slug/", (req, res, next) => {
    const n = content.nichesBySlug[req.params.slug];
    if (!n) return next();
    const ds = byNiche(designs, n.slug).length ? byNiche(designs, n.slug) : designs.slice(0, 8);
    res.render("niche.html", {
      n, styles: n.styles.map(([s, why]) => [content.productsBySlug[s], why]),
      designs: ds.slice(0, 8), featured: ds[0], designs3d: ds.slice(0, 8),
      others: catalog.NICHES.filter((o) => o.slug !== n.slug),
      meta: { title: L(n.title), description: L(n.description) },
      crumbs: breadcrumbs([`Packaging for ${n.short.toLowerCase()}`, null]),
    });
  });

  page("get", "product", "/:slug/", (req, res, next) => {
    const p = content.productsBySlug[req.params.slug];
    if (!p) return next();
    const styles = PRODUCT_STYLES[p.slug] || ["mailer"];
    const ds = byStyle(designs, styles);
    res.render("product.html", {
      p, table: p.style ? fromPriceTable(p.style, market, pricing) : [],
      materials: p.style ? pricing.styles[p.style].materials.map((k) => [k, catalog.MATERIAL_LABELS[k]]) : [],
      finishes: catalog.FINISHES, price_range: p.style ? lowestPrice(p.style, market, pricing) : null,
      niches: p.niches.map((s) => content.nichesBySlug[s]), others: catalog.PRODUCTS.filter((o) => o.slug !== p.slug),
      designs: ds.slice(0, 8), featured: ds[0], designs3d: ds.slice(0, 8), studio_style: styles[0],
      meta: { title: L(p.title), description: L(p.description) },
      crumbs: breadcrumbs([L(p.name), null]),
    });
  });

  // Add the trailing slash Flask-style: /pricing -> /pricing/
  router.get(/^\/[^.]*[^/]$/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const query = req.originalUrl.slice(req.originalUrl.split("?")[0].length);
    res.redirect(301, `${req.baseUrl}${req.path}/${query}`);
  });

  return router;
}

module.exports = { createSiteRouter, HttpError };
