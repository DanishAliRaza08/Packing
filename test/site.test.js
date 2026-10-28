// Run with: npm test
process.env.NODE_ENV = "test";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createApp } = require("../src/app");
const { allPages } = require("../src/pages");
const { marketUrl } = require("../src/templating");
const { loadContent } = require("../src/content");
const { estimate, EstimateError } = require("../src/pricing");
const { PATTERNS, STYLES, loadDesigns } = require("../src/designs");

const content = loadContent();
let server;
let base;
let app;
let tmp;

function startApp(overrides = {}) {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fp-test-"));
  app = createApp({
    database: path.join(tmp, "quotes.json"), uploadDir: path.join(tmp, "uploads"),
    adminPassword: "secret-pass", rateLimitCount: 50, sendEmail: async () => true, ...overrides,
  });
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

before(() => startApp());
after(() => server.close());

// A tiny browser: keeps the session cookie between requests.
class Client {
  constructor() {
    this.cookies = {};
  }

  async request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) headers.cookie = cookie;
    const res = await fetch(base + url, { redirect: "manual", ...options, headers });
    for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies[pair.slice(0, i)] = pair.slice(i + 1);
    }
    res.text_ = await res.text();
    return res;
  }

  get(url) {
    return this.request(url);
  }

  post(url, fields) {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) for (const item of [].concat(v)) body.append(k, item);
    return this.request(url, { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  }

  postMultipart(url, fields, file) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append("artwork", new Blob([file.data]), file.name);
    return this.request(url, { method: "POST", body: form });
  }

  async csrf(url) {
    const res = await this.get(url);
    return res.text_.match(/name="_csrf" value="([^"]+)"/)[1];
  }
}

const allUrls = () => ["us", "uk"].flatMap((m) => allPages(m, content).map((p) => marketUrl(p.endpoint, m, p.args)));

function quoteForm(token, extra = {}) {
  return {
    _csrf: token, style: "mailer", length: "9", width: "6", height: "3", quantity: "500",
    print_sides: "outside", name: "Test Buyer", email: "buyer@example.com", consent: "yes", ...extra,
  };
}

async function login(client) {
  const token = await client.csrf("/admin/login");
  return client.post("/admin/login", { _csrf: token, password: "secret-pass" });
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

test("every page renders with SEO basics", async () => {
  const c = new Client();
  for (const url of allUrls()) {
    const res = await c.get(url);
    assert.equal(res.status, 200, url);
    const html = res.text_;
    const title = decode(html.match(/<title>(.*?)<\/title>/)[1]);
    assert.ok(title.length <= 60, `${url}: ${title}`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, url);
    assert.ok(html.includes('rel="canonical"'), url);
    for (const [, block] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(block);
    assert.ok(!/\{(min|hours|days|custom_from)\}/.test(html), `${url} has an unfilled placeholder`);
  }
});

test("UK pages use UK wording and currency", async () => {
  const c = new Client();
  const html = (await c.get("/uk/custom-mailer-boxes/")).text_;
  assert.ok(html.includes('lang="en-GB"'));
  assert.ok(html.includes("£") && html.includes("cm"));
  assert.ok(html.includes('hreflang="en-us" href="https://freestylepacking.shop/custom-mailer-boxes/"'));
  const us = (await c.get("/custom-mailer-boxes/")).text_;
  assert.ok(us.includes("$") && us.includes("color"));
});

test("UK-only post is missing on the US site", async () => {
  const c = new Client();
  assert.equal((await c.get("/uk/blog/uk-packaging-epr-explained/")).status, 200);
  assert.equal((await c.get("/blog/uk-packaging-epr-explained/")).status, 404);
});

test("sitemap and robots", async () => {
  const c = new Client();
  const xml = (await c.get("/sitemap.xml")).text_;
  for (const url of allUrls()) assert.ok(xml.includes(`https://freestylepacking.shop${url}`), url);
  const robots = (await c.get("/robots.txt")).text_;
  assert.ok(robots.includes("Disallow: /admin/") && robots.includes("sitemap.xml"));
});

test("404 page and trailing-slash redirects", async () => {
  const c = new Client();
  const res = await c.get("/no-such-page/");
  assert.equal(res.status, 404);
  assert.ok(decode(res.text_).includes("can't find that page"));
  const redirect = await c.get("/pricing?x=1");
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "/pricing/?x=1");
  assert.equal((await c.get("/uk")).headers.get("location"), "/uk/");
});

test("estimate maths", () => {
  const cfg = content.pricing;
  const est = estimate({ style: "mailer", dims: [9, 6, 3], qty: 500 }, cfg);
  assert.deepEqual([est.per_box_low, est.per_box_high], [1.5, 1.8]);
  assert.equal(est.total_low, 750);
  const uk = estimate({ style: "mailer", dims: [9 * 2.54, 6 * 2.54, 3 * 2.54], qty: 500, market: "uk" }, cfg);
  assert.equal(uk.currency, "GBP");
  assert.equal(uk.per_box_low, Math.round(1.5 * cfg.markets.uk.rate * 100) / 100);
  assert.ok(estimate({ style: "mailer", dims: [9, 6, 3], qty: 2500 }, cfg).per_box_low < est.per_box_low);
  assert.throws(() => estimate({ style: "mailer", dims: [9, 6, 3], qty: 10 }, cfg), EstimateError);
  assert.throws(() => estimate({ style: "rigid", dims: [9, 6, 3], qty: 500, material: "kraft-e" }, cfg), EstimateError);
});

test("estimate API", async () => {
  const post = (body, url = "/api/estimate") => fetch(base + url, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const ok = await post({ style: "mailer", length: 9, width: 6, height: 3, quantity: 500 });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).per_box, "$1.50–$1.80");
  const uk = await (await post({ style: "mailer", length: 22.9, width: 15.2, height: 7.6, quantity: "500" }, "/uk/api/estimate")).json();
  assert.ok(uk.per_box.startsWith("£"));
  const bad = await post({ style: "mailer", quantity: 5 });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).ok, false);
});

test("quote submission is saved with artwork", async () => {
  const c = new Client();
  const token = await c.csrf("/quote/");
  const res = await c.postMultipart("/quote/", quoteForm(token), { data: "%PDF-1.4 test", name: "logo.pdf" });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /\/thanks\/quote\/$/);
  await login(c);
  const listing = (await c.get("/admin/")).text_;
  assert.ok(listing.includes("Test Buyer") && listing.includes("750"));
  const id = listing.match(/\/admin\/quote\/(\d+)/)[1];
  assert.ok((await c.get(`/admin/quote/${id}`)).text_.includes("logo.pdf"));
  assert.ok((await c.get(`/admin/quote/${id}/artwork`)).text_.startsWith("%PDF"));
});

test("quote validation errors", async () => {
  const c = new Client();
  const token = await c.csrf("/quote/");
  const res = await c.post("/quote/", quoteForm(token, { email: "nope", consent: "" }));
  assert.equal(res.status, 400);
  assert.ok(res.text_.includes("valid email") && res.text_.includes("privacy policy so we can reply"));
});

test("upload rejects fake and wrong files", async () => {
  const c = new Client();
  const token = await c.csrf("/quote/");
  const fake = await c.postMultipart("/quote/", quoteForm(token), { data: "MZ not a pdf", name: "logo.pdf" });
  assert.equal(fake.status, 400);
  assert.ok(fake.text_.includes("look like a real PDF"));
  const exe = await c.postMultipart("/quote/", quoteForm(token), { data: "hello", name: "run.exe" });
  assert.equal(exe.status, 400);
});

test("honeypot and CSRF", async () => {
  const c = new Client();
  const token = await c.csrf("/quote/");
  const bot = await c.post("/quote/", quoteForm(token, { website: "http://spam", name: "Spam Bot" }));
  assert.equal(bot.status, 302);
  await login(c);
  assert.ok(!(await c.get("/admin/")).text_.includes("Spam Bot"));
  assert.equal((await c.post("/quote/", quoteForm("wrong"))).status, 400);
});

test("rate limit", async () => {
  app.locals.ctx.config.rateLimitCount = 2;
  app.locals.ctx.limiter.hits.clear();
  try {
    const c = new Client();
    const token = await c.csrf("/contact/");
    const form = { _csrf: token, name: "A", email: "a@example.com", message: "Hi", consent: "yes" };
    assert.equal((await c.post("/contact/", form)).status, 302);
    assert.equal((await c.post("/contact/", form)).status, 302);
    assert.equal((await c.post("/contact/", form)).status, 429);
  } finally {
    app.locals.ctx.config.rateLimitCount = 50;
    app.locals.ctx.limiter.hits.clear();
  }
});

test("samples form on the UK site", async () => {
  const c = new Client();
  const token = await c.csrf("/uk/samples/");
  const res = await c.post("/uk/samples/", { _csrf: token, name: "B", email: "b@example.com", consent: "yes", samples: ["kraft-e", "white-e"] });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /^\/uk\/thanks\/sample\/$/);
});

test("admin requires login, updates status and exports safe CSV", async () => {
  const c = new Client();
  assert.equal((await c.get("/admin/")).status, 302);
  const token = await c.csrf("/admin/login");
  assert.ok((await c.post("/admin/login", { _csrf: token, password: "wrong" })).text_.includes("Wrong password"));

  const qt = await c.csrf("/quote/");
  await c.post("/quote/", quoteForm(qt, { name: "=HYPERLINK(1)" }));
  await login(c);
  const listing = (await c.get("/admin/")).text_;
  const id = listing.match(/\/admin\/quote\/(\d+)/)[1];
  const dt = await c.csrf(`/admin/quote/${id}`);
  const saved = await c.post(`/admin/quote/${id}`, { _csrf: dt, status: "Quoted", notes: "sent quote" });
  assert.equal(saved.status, 302);
  assert.ok((await c.get("/admin/?status=Quoted")).text_.includes("HYPERLINK"));
  const csv = (await c.get("/admin/export.csv")).text_;
  assert.ok(csv.includes("'=HYPERLINK(1)") && csv.includes("sent quote"));
});

test("designs file has 40+ valid designs", () => {
  const designs = loadDesigns();
  assert.ok(designs.length >= 40);
  assert.equal(new Set(designs.map((d) => d.id)).size, designs.length);
  assert.deepEqual(new Set(designs.map((d) => d.style)), new Set(Object.keys(STYLES)));
  for (const d of designs) {
    assert.ok(PATTERNS.includes(d.pattern.type));
    assert.ok(d.dims.length === 3 && d.dims.every((v) => v > 0));
    for (const colour of [d.board, d.inside, d.logo.color, d.pattern.color]) assert.match(colour, /^#[0-9a-fA-F]{6}$/, d.id);
  }
});

test("studio page lists every design", async () => {
  const c = new Client();
  const html = (await c.get("/box-studio/")).text_;
  assert.equal((html.match(/data-design-card=/g) || []).length, content.designs.length);
  const data = JSON.parse(html.match(/<script type="application\/json" id="box-designs">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.length, content.designs.length);
  assert.ok(html.includes('type="importmap"') && html.includes("three.module.min.js"));
  assert.ok((await c.get("/uk/box-studio/")).text_.includes('data-unit="cm"'));
});

test("3D viewers on home, product and industry pages", async () => {
  const c = new Client();
  for (const url of ["/", "/custom-mailer-boxes/", "/rigid-gift-boxes/", "/packaging-for-candles/"]) {
    const html = (await c.get(url)).text_;
    assert.ok(html.includes("data-box3d=") && html.includes("box3d/auto.js"), url);
  }
  assert.ok(!(await c.get("/faq/")).text_.includes("box3d/auto.js"));
});

test("quote keeps the chosen 3D design", async () => {
  const c = new Client();
  const page = (await c.get("/quote/?design=Botanical%20Candle%20Mailer%20(botanical-candle-mailer)")).text_;
  assert.ok(page.includes("Your 3D design:"));
  const token = await c.csrf("/quote/");
  await c.post("/quote/", quoteForm(token, { name: "Design Fan", design: "Botanical Candle Mailer (botanical-candle-mailer)" }));
  await login(c);
  const listing = (await c.get("/admin/")).text_;
  const id = listing.match(/\/admin\/quote\/(\d+)/)[1];
  assert.ok((await c.get(`/admin/quote/${id}`)).text_.includes("botanical-candle-mailer"));
});

test("static files and security headers", async () => {
  const res = await fetch(`${base}/static/js/box3d/models.js`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(!res.headers.get("x-powered-by"));
});

test("admin disabled without a password", async () => {
  app.locals.ctx.config.adminPassword = "";
  try {
    assert.equal((await new Client().get("/admin/")).status, 403);
  } finally {
    app.locals.ctx.config.adminPassword = "secret-pass";
  }
});
