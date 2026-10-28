// Password-protected admin: list requests, update status, download artwork, export CSV.
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const { STATUSES, FIELDS } = require("../db");
const { HttpError, checkCsrf } = require("../security");
const { urlFor } = require("../templating");

function passwordMatches(given, expected) {
  // Compare hashes so the check takes the same time whatever the password length.
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

// Stop spreadsheet apps treating customer text as a formula.
function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createAdminRouter({ config, store, limiter }) {
  const router = express.Router({ strict: true });

  router.use((req, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow");
    res.set("Cache-Control", "no-store");
    next();
  });

  function loginRequired(req, res, next) {
    if (!config.adminPassword) throw new HttpError(403, "Admin is disabled. Set ADMIN_PASSWORD in your environment.");
    if (!req.session.admin) return res.redirect(`${urlFor("admin.login")}?next=${encodeURIComponent(req.originalUrl)}`);
    next();
  }

  const meta = (title) => ({ title, description: "" });

  router.get("/login", (req, res) => res.render("admin/login.html", { error: null, noindex: true, meta: meta("Admin login") }));

  router.post("/login", (req, res) => {
    checkCsrf(req);
    let error = "Wrong password.";
    if (!limiter.allow(`admin-login:${req.ip}`, config.rateLimitCount, config.rateLimitWindow)) {
      error = "Too many attempts. Try again in a few minutes.";
    } else if (config.adminPassword && passwordMatches(req.body.password || "", config.adminPassword)) {
      req.session = { admin: true };
      const target = String(req.query.next || "");
      return res.redirect(target.startsWith("/admin") ? target : urlFor("admin.index"));
    }
    res.render("admin/login.html", { error, noindex: true, meta: meta("Admin login") });
  });

  router.post("/logout", (req, res) => {
    checkCsrf(req);
    req.session = null;
    res.redirect(urlFor("admin.login"));
  });

  router.get("/", loginRequired, (req, res) => {
    const status = req.query.status || null;
    const kind = req.query.kind || null;
    res.render("admin/index.html", {
      quotes: store.listQuotes(status, kind), statuses: STATUSES, counts: store.statusCounts(),
      status, kind, noindex: true, meta: meta("Requests"),
    });
  });

  router.get("/quote/:id", loginRequired, (req, res, next) => {
    const q = store.getQuote(req.params.id);
    if (!q) return next();
    res.render("admin/detail.html", { q, statuses: STATUSES, noindex: true, saved: req.query.saved, meta: meta(`Request #${q.id}`) });
  });

  router.post("/quote/:id", loginRequired, (req, res, next) => {
    checkCsrf(req);
    if (!store.getQuote(req.params.id)) return next();
    if (!STATUSES.includes(req.body.status)) throw new HttpError(400, "Unknown status.");
    store.updateQuote(req.params.id, req.body.status, String(req.body.notes || "").slice(0, 5000));
    res.redirect(urlFor("admin.detail", { quote_id: req.params.id, saved: 1 }));
  });

  router.get("/quote/:id/artwork", loginRequired, (req, res, next) => {
    const q = store.getQuote(req.params.id);
    if (!q || !q.artwork_file) return next();
    res.download(path.join(path.resolve(config.uploadDir), path.basename(q.artwork_file)), q.artwork_name);
  });

  router.get("/export.csv", loginRequired, (req, res) => {
    const rows = store.listQuotes(req.query.status || null, req.query.kind || null);
    const columns = ["id", "created_at", "status", ...FIELDS.filter((f) => f !== "artwork_file" && f !== "ip"), "notes"];
    const lines = [columns.join(",")].concat(rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")));
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", "attachment; filename=quote-requests.csv");
    res.send(lines.join("\r\n") + "\r\n");
  });

  return router;
}

module.exports = { createAdminRouter };
