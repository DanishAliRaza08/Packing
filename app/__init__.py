"""Flask app for a custom printed packaging brokerage (US site at /, UK site at /uk/)."""

import json
import re
from datetime import date
from pathlib import Path

from flask import Flask, g, request, url_for
from markupsafe import Markup, escape

from . import db
from .config import Config
from .content.catalog import LOCALE, NICHES, PRODUCTS
from .designs import STYLES as DESIGN_STYLES, load_designs
from .pricing import CM_PER_INCH, load_pricing
from .security import HONEYPOT_FIELD, csrf_token

SITE_FILE = Path(__file__).parent / "content" / "site.json"
MARKETS = ("us", "uk")


def load_site(path=SITE_FILE):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def create_app(overrides=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)
    Path(app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)

    app.config["SITE"] = load_site()
    app.config["PRICING"] = load_pricing()
    app.config["DESIGNS"] = load_designs()
    db.init_db(app)

    from .views import bp as site_bp
    from .admin import bp as admin_bp
    from .seo import bp as seo_bp

    app.register_blueprint(site_bp, name="us")
    app.register_blueprint(site_bp, name="uk", url_prefix="/uk")
    app.register_blueprint(admin_bp)
    app.register_blueprint(seo_bp)

    register_template_helpers(app)
    register_security_headers(app)
    register_errors(app)
    return app


def current_market():
    if request.blueprint in MARKETS:
        return request.blueprint
    # Pages outside the site blueprints (e.g. a 404) follow the URL prefix.
    return "uk" if request.path.startswith("/uk/") else "us"


def fill(text):
    """Replace {min}, {hours}, {days}, {custom_from} with values from site.json."""
    site = g.get("site_cfg")
    if site is None:
        from flask import current_app
        site = current_app.config["SITE"]
    return (
        text.replace("{min}", str(site["min_units"]))
        .replace("{hours}", str(site["mockup_hours"]))
        .replace("{days}", site["production_days"])
        .replace("{custom_from}", f"{site['free_custom_sizing_from']:,}")
    )


def localise(value, market=None):
    if isinstance(value, dict) and set(value) <= set(MARKETS):
        value = value.get(market or current_market(), value.get("us"))
    return fill(value) if isinstance(value, str) else value


def format_money(amount, market=None):
    market = market or current_market()
    from flask import current_app
    symbol = current_app.config["PRICING"]["markets"][market]["symbol"]
    return f"{symbol}{amount:,.2f}"


def format_dims(dims_in, market=None):
    market = market or current_market()
    if market == "uk":
        values = [round(d * CM_PER_INCH * 2) / 2 for d in dims_in]
        unit = "cm"
    else:
        values, unit = dims_in, "in"
    text = " × ".join(f"{v:g}" for v in values)
    return f"{text} {unit}"


def market_url(endpoint, market=None, **values):
    """URL for an endpoint on the current (or given) market's site."""
    return url_for(f"{market or current_market()}.{endpoint}", **values)


def register_template_helpers(app):
    @app.before_request
    def set_globals():
        g.site_cfg = app.config["SITE"]

    @app.context_processor
    def inject():
        market = current_market()
        site = app.config["SITE"]
        endpoint = (request.endpoint or "").split(".", 1)[-1]
        is_site_page = request.blueprint in MARKETS

        def alternate(mkt):
            available = g.get("markets_available", MARKETS)
            if not is_site_page or mkt not in available:
                return None
            return site["domain"].rstrip("/") + market_url(endpoint, mkt, **(request.view_args or {}))

        def absolute(path):
            return site["domain"].rstrip("/") + path

        def switch_url(mkt):
            """This page on the other market's site, or that site's home page."""
            available = g.get("markets_available", MARKETS)
            if is_site_page and mkt in available:
                return market_url(endpoint, mkt, **(request.view_args or {}))
            return market_url("home", mkt)

        def crumbs_ld(crumbs):
            return [
                {"@type": "ListItem", "position": i, "name": label,
                 **({"item": absolute(url)} if url else {"item": absolute(request.path)})}
                for i, (label, url) in enumerate(crumbs, start=1)
            ]

        def faq_ld(faqs):
            return [
                {"@type": "Question", "name": localise(q, market),
                 "acceptedAnswer": {"@type": "Answer", "text": localise(a, market)}}
                for q, a in faqs
            ]

        return {
            "design_count": len(app.config["DESIGNS"]),
            "design_styles": DESIGN_STYLES,
            "faq_ld": faq_ld,
            "switch_url": switch_url,
            "crumbs_ld": crumbs_ld,
            "main_niche": next(n for n in NICHES if n["slug"] == site["main_niche"]),
            "nav_products": PRODUCTS,
            "nav_niches": [n for s in [site["main_niche"]] + site["secondary_niches"]
                           for n in NICHES if n["slug"] == s],
            "market": market,
            "t": LOCALE[market],
            "site": site,
            "pricing_cfg": app.config["PRICING"],
            "link": market_url,
            "alternate": alternate,
            "absolute": absolute,
            "csrf_token": csrf_token,
            "honeypot": HONEYPOT_FIELD,
            "money": format_money,
            "dims": format_dims,
            "today": date.today().isoformat(),
            "year": date.today().year,
        }

    app.jinja_env.filters["m"] = localise
    app.jinja_env.filters["json_ld"] = lambda data: Markup(
        json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    )

    @app.template_filter("title")
    def page_title(title):
        brand = app.config["SITE"]["brand_name"]
        full = f"{title} | {brand}"
        return full if len(full) <= 60 else title

    @app.template_filter("slugify")
    def slugify(text):
        return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")

    @app.template_filter("nl2br")
    def nl2br(text):
        return Markup("<br>".join(escape(text or "").split("\n")))


def register_security_headers(app):
    @app.after_request
    def headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        return resp


def register_errors(app):
    from flask import render_template

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("404.html"), 404

    @app.errorhandler(413)
    def too_large(_e):
        return render_template("error.html", message="That file is larger than 25 MB. Please upload a smaller file, or email it to us."), 413

    @app.errorhandler(400)
    def bad_request(e):
        return render_template("error.html", message=getattr(e, "description", "Something went wrong.")), 400
