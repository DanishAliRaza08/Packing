// Builds the Express app: US site at /, UK site at /uk/, admin at /admin/.
const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");
const multer = require("multer");
const { loadConfig } = require("./config");
const { loadContent } = require("./content");
const { Store } = require("./db");
const { createMailer } = require("./mailer");
const { RateLimiter, HttpError } = require("./security");
const { createEnv, templateLocals } = require("./templating");
const { createSiteRouter } = require("./routes/site");
const { createAdminRouter } = require("./routes/admin");
const { createSeoRouter } = require("./routes/seo");

function createApp(overrides = {}) {
  const config = { ...loadConfig(), ...overrides };
  const content = loadContent();
  const app = express();
  app.set("strict routing", true);
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  createEnv(app, content);

  const ctx = {
    config,
    content,
    store: new Store(config.database),
    limiter: new RateLimiter(),
    sendEmail: config.sendEmail || createMailer(config.smtp),
    upload: multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadBytes, files: 1, fields: 60 } }).single("artwork"),
  };
  app.locals.ctx = ctx;

  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("X-Frame-Options", "SAMEORIGIN");
    next();
  });
  app.use("/static", express.static(path.join(__dirname, "..", "public"), { maxAge: "7d" }));
  app.use(cookieSession({ name: "session", secret: config.secretKey, httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 }));
  // Mark the cookie "secure" whenever the visitor is on https (needs TRUST_PROXY behind a proxy).
  app.use((req, res, next) => {
    req.sessionOptions.secure = req.secure;
    next();
  });
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use((req, res, next) => {
    Object.assign(res.locals, templateLocals(req, res, content));
    next();
  });

  app.use(createSeoRouter(ctx));
  app.use("/admin", createAdminRouter(ctx));
  app.get("/uk", (req, res) => res.redirect(301, "/uk/"));
  app.use("/uk", createSiteRouter("uk", ctx));
  app.use("/", createSiteRouter("us", ctx));

  app.use((req, res) => res.status(404).render("404.html"));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err instanceof multer.MulterError) {
      status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      message = status === 413
        ? "That file is larger than 25 MB. Please upload a smaller file, or email it to us."
        : "Something was wrong with the upload. Please try again.";
    } else if (!(err instanceof HttpError) && status >= 500) {
      console.error(err);
      message = "Something went wrong on our side. Please try again, or email us.";
    }
    res.status(status).render("error.html", { message });
  });

  return app;
}

module.exports = { createApp };
