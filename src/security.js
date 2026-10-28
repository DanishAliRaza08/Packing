// Form protection: CSRF tokens, honeypot, rate limiting and upload checks.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HONEYPOT_FIELD = "website";

const ALLOWED_UPLOADS = {
  ".pdf": [Buffer.from("%PDF")],
  ".ai": [Buffer.from("%PDF"), Buffer.from("%!PS")],
  ".eps": [Buffer.from("%!PS"), Buffer.from([0xc5, 0xd0, 0xd3, 0xc6])],
  ".png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ".jpg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".svg": null, // text format, checked separately
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function csrfToken(session) {
  if (!session.csrf) session.csrf = crypto.randomBytes(32).toString("base64url");
  return session.csrf;
}

function checkCsrf(req) {
  const sent = String((req.body && req.body._csrf) || "");
  const expected = String((req.session && req.session.csrf) || "");
  const ok = sent && expected && sent.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) throw new HttpError(400, "Your session expired. Please reload the page and try again.");
}

const isBot = (req) => Boolean(String((req.body && req.body[HONEYPOT_FIELD]) || "").trim());

// In-memory sliding window per client IP. Works for a single app process.
class RateLimiter {
  constructor() {
    this.hits = new Map();
  }

  allow(key, limit, windowSeconds) {
    const now = Date.now();
    const list = (this.hits.get(key) || []).filter((t) => now - t < windowSeconds * 1000);
    if (list.length >= limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    return true;
  }
}

class UploadError extends Error {}

// Validates and stores an uploaded file (from multer's memory storage).
// Returns [originalName, storedName] or [null, null] when nothing was uploaded.
function saveUpload(file, uploadDir) {
  if (!file || !file.originalname) return [null, null];
  const original = path.basename(file.originalname).slice(0, 200);
  const ext = path.extname(original).toLowerCase();
  if (!(ext in ALLOWED_UPLOADS)) throw new UploadError("Please upload a PDF, AI, EPS, SVG, PNG or JPG file.");
  const head = file.buffer.subarray(0, 512);
  const signatures = ALLOWED_UPLOADS[ext];
  if (signatures === null) {
    const text = head.toString("utf8").toLowerCase();
    if (!text.includes("<svg") && !text.includes("<?xml")) throw new UploadError("That SVG file doesn't look valid.");
  } else if (!signatures.some((sig) => head.subarray(0, sig.length).equals(sig))) {
    throw new UploadError(`That file doesn't look like a real ${ext.slice(1).toUpperCase()} file.`);
  }
  const stored = crypto.randomBytes(16).toString("hex") + ext;
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, stored), file.buffer);
  return [original, stored];
}

module.exports = { HONEYPOT_FIELD, HttpError, csrfToken, checkCsrf, isBot, RateLimiter, UploadError, saveUpload };
