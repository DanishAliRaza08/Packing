"""Password-protected admin: list requests, update status, download artwork, export CSV."""

import csv
import io
import secrets
from functools import wraps
from pathlib import Path

from flask import (Blueprint, Response, abort, current_app, redirect, render_template,
                   request, send_from_directory, session, url_for)

from . import db
from .security import check_csrf, rate_limited

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.after_request
def no_index(resp):
    resp.headers["X-Robots-Tag"] = "noindex, nofollow"
    resp.headers["Cache-Control"] = "no-store"
    return resp


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_app.config["ADMIN_PASSWORD"]:
            abort(403, "Admin is disabled. Set ADMIN_PASSWORD in your .env file.")
        if not session.get("admin"):
            return redirect(url_for("admin.login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


@bp.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        check_csrf()
        expected = current_app.config["ADMIN_PASSWORD"]
        if rate_limited("admin-login"):
            error = "Too many attempts. Try again in a few minutes."
        elif expected and secrets.compare_digest(request.form.get("password", ""), expected):
            session.clear()
            session["admin"] = True
            target = request.args.get("next", "")
            return redirect(target if target.startswith("/admin") else url_for("admin.index"))
        else:
            error = "Wrong password."
    return render_template("admin/login.html", error=error, noindex=True,
                           meta={"title": "Admin login", "description": ""})


@bp.route("/logout", methods=["POST"])
def logout():
    check_csrf()
    session.clear()
    return redirect(url_for("admin.login"))


@bp.route("/")
@login_required
def index():
    status = request.args.get("status") or None
    kind = request.args.get("kind") or None
    return render_template(
        "admin/index.html", quotes=db.list_quotes(status, kind), statuses=db.STATUSES,
        counts=db.status_counts(), status=status, kind=kind, noindex=True,
        meta={"title": "Requests", "description": ""},
    )


@bp.route("/quote/<int:quote_id>", methods=["GET", "POST"])
@login_required
def detail(quote_id):
    quote = db.get_quote(quote_id)
    if not quote:
        abort(404)
    if request.method == "POST":
        check_csrf()
        try:
            db.update_quote(quote_id, request.form.get("status", ""), request.form.get("notes", "")[:5000])
        except ValueError:
            abort(400, "Unknown status.")
        return redirect(url_for("admin.detail", quote_id=quote_id, saved=1))
    return render_template("admin/detail.html", q=quote, statuses=db.STATUSES, noindex=True,
                           saved=request.args.get("saved"), meta={"title": f"Request #{quote_id}", "description": ""})


@bp.route("/quote/<int:quote_id>/artwork")
@login_required
def artwork(quote_id):
    quote = db.get_quote(quote_id)
    if not quote or not quote["artwork_file"]:
        abort(404)
    return send_from_directory(
        Path(current_app.config["UPLOAD_DIR"]).resolve(), quote["artwork_file"],
        as_attachment=True, download_name=quote["artwork_name"],
    )


def _csv_safe(value):
    """Stop spreadsheet apps treating customer text as a formula."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


@bp.route("/export.csv")
@login_required
def export_csv():
    rows = db.list_quotes(request.args.get("status") or None, request.args.get("kind") or None)
    out = io.StringIO()
    writer = csv.writer(out)
    columns = ["id", "created_at", "status"] + [f for f in db.FIELDS if f not in ("artwork_file", "ip")] + ["notes"]
    writer.writerow(columns)
    for r in rows:
        writer.writerow([_csv_safe(r[c]) for c in columns])
    return Response(out.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=quote-requests.csv"})
