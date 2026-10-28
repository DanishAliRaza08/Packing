// Stores quote, sample and contact requests in a JSON file (data/quotes.json).
// No database server is needed. Writes go to a temporary file first, then replace
// the real one, so a crash mid-write can't corrupt it.
const fs = require("fs");
const path = require("path");

const STATUSES = ["New", "Mockup sent", "Quoted", "Won", "Lost"];

const FIELDS = [
  "kind", "market", "style", "length", "width", "height", "unit", "quantity",
  "material", "print_sides", "colours", "finishes", "design_help",
  "artwork_name", "artwork_file", "name", "company", "email", "phone",
  "country", "postcode", "deadline", "source", "message",
  "estimate_low", "estimate_high", "currency", "ip", "design",
];

class Store {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { nextId: 1, quotes: [] };
  }

  save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }

  createQuote(values) {
    const row = { id: this.data.nextId++, created_at: new Date().toISOString().slice(0, 19) + "Z", status: "New", notes: "" };
    for (const key of FIELDS) row[key] = values[key] ?? null;
    this.data.quotes.push(row);
    this.save();
    return row.id;
  }

  listQuotes(status, kind) {
    return this.data.quotes
      .filter((q) => (!status || q.status === status) && (!kind || q.kind === kind))
      .sort((a, b) => b.id - a.id);
  }

  getQuote(id) {
    return this.data.quotes.find((q) => q.id === Number(id)) || null;
  }

  updateQuote(id, status, notes) {
    if (!STATUSES.includes(status)) throw new Error("Unknown status");
    const quote = this.getQuote(id);
    if (!quote) throw new Error("Not found");
    quote.status = status;
    quote.notes = notes;
    this.save();
  }

  statusCounts() {
    const counts = {};
    for (const q of this.data.quotes) counts[q.status] = (counts[q.status] || 0) + 1;
    return counts;
  }
}

module.exports = { Store, STATUSES, FIELDS };
