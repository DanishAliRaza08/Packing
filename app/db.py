"""SQLite storage for quote, sample and contact requests.

Uses plain SQL so moving to PostgreSQL later only means changing the
connection and the `?` placeholders.
"""

import sqlite3
from datetime import datetime, timezone

from flask import current_app, g

STATUSES = ["New", "Mockup sent", "Quoted", "Won", "Lost"]

FIELDS = [
    "kind", "market", "style", "length", "width", "height", "unit", "quantity",
    "material", "print_sides", "colours", "finishes", "design_help",
    "artwork_name", "artwork_file", "name", "company", "email", "phone",
    "country", "postcode", "deadline", "source", "message",
    "estimate_low", "estimate_high", "currency", "ip", "design",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    kind TEXT NOT NULL DEFAULT 'quote',
    market TEXT, style TEXT,
    length REAL, width REAL, height REAL, unit TEXT,
    quantity INTEGER, material TEXT, print_sides TEXT, colours TEXT,
    finishes TEXT, design_help INTEGER DEFAULT 0,
    artwork_name TEXT, artwork_file TEXT,
    name TEXT NOT NULL, company TEXT, email TEXT NOT NULL, phone TEXT,
    country TEXT, postcode TEXT, deadline TEXT, source TEXT, message TEXT,
    estimate_low REAL, estimate_high REAL, currency TEXT,
    notes TEXT DEFAULT '', ip TEXT, design TEXT
);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
"""


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(app):
    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
        # Add columns introduced after a database was first created.
        existing = {row["name"] for row in db.execute("PRAGMA table_info(quotes)")}
        if "design" not in existing:
            db.execute("ALTER TABLE quotes ADD COLUMN design TEXT")
            db.commit()
    app.teardown_appcontext(close_db)


def create_quote(data):
    row = {k: data.get(k) for k in FIELDS}
    cols = ", ".join(["created_at"] + FIELDS)
    marks = ", ".join(["?"] * (len(FIELDS) + 1))
    db = get_db()
    cur = db.execute(
        f"INSERT INTO quotes ({cols}) VALUES ({marks})",
        [datetime.now(timezone.utc).isoformat(timespec="seconds")] + [row[k] for k in FIELDS],
    )
    db.commit()
    return cur.lastrowid


def list_quotes(status=None, kind=None):
    sql, args = "SELECT * FROM quotes WHERE 1=1", []
    if status:
        sql += " AND status = ?"
        args.append(status)
    if kind:
        sql += " AND kind = ?"
        args.append(kind)
    return get_db().execute(sql + " ORDER BY id DESC", args).fetchall()


def get_quote(quote_id):
    return get_db().execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()


def update_quote(quote_id, status, notes):
    if status not in STATUSES:
        raise ValueError("Unknown status")
    db = get_db()
    db.execute("UPDATE quotes SET status = ?, notes = ? WHERE id = ?", (status, notes, quote_id))
    db.commit()


def status_counts():
    rows = get_db().execute("SELECT status, COUNT(*) AS n FROM quotes GROUP BY status").fetchall()
    return {r["status"]: r["n"] for r in rows}
