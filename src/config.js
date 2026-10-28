// Settings come from environment variables (or a .env file). See .env.example.
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function loadConfig(env = process.env) {
  const dataDir = env.DATA_DIR || path.join(ROOT, "data");
  let secret = env.SECRET_KEY;
  if (!secret || secret === "change-me") {
    // Without a fixed key, logins and form sessions reset whenever the app restarts.
    secret = crypto.randomBytes(32).toString("hex");
    if (env.NODE_ENV !== "test") console.warn("SECRET_KEY is not set; using a temporary one. Set it in your environment.");
  }
  return {
    root: ROOT,
    port: int(env.PORT, 3000),
    secretKey: secret,
    dataDir,
    database: env.DATABASE_PATH || path.join(dataDir, "quotes.json"),
    uploadDir: env.UPLOAD_DIR || path.join(dataDir, "uploads"),
    maxUploadBytes: 25 * 1024 * 1024,
    adminPassword: env.ADMIN_PASSWORD || "",
    notifyEmail: env.NOTIFY_EMAIL || "",
    smtp: {
      host: env.SMTP_HOST || "",
      port: int(env.SMTP_PORT, 587),
      user: env.SMTP_USER || "",
      password: env.SMTP_PASSWORD || "",
      from: env.MAIL_FROM || "",
    },
    rateLimitCount: int(env.RATE_LIMIT_COUNT, 5),
    rateLimitWindow: int(env.RATE_LIMIT_WINDOW, 600),
    trustProxy: env.TRUST_PROXY === undefined ? 1 : int(env.TRUST_PROXY, 1),
  };
}

module.exports = { loadConfig, ROOT };
