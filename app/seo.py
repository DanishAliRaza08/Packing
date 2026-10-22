"""sitemap.xml and robots.txt, generated from the page registry."""

from flask import Blueprint, Response, current_app, render_template

from . import market_url
from .pages import all_pages

bp = Blueprint("seo", __name__)


@bp.route("/sitemap.xml")
def sitemap():
    domain = current_app.config["SITE"]["domain"].rstrip("/")
    seen, entries = set(), []
    for market in ("us", "uk"):
        for endpoint, args, _title, _desc, markets in all_pages(market):
            key = (market, endpoint, tuple(sorted(args.items())))
            if key in seen:
                continue
            seen.add(key)
            alternates = {m: domain + market_url(endpoint, m, **args) for m in markets}
            entries.append({"loc": alternates[market], "alternates": alternates})
    xml = render_template("sitemap.xml", entries=entries)
    return Response(xml, mimetype="application/xml")


@bp.route("/robots.txt")
def robots():
    domain = current_app.config["SITE"]["domain"].rstrip("/")
    body = "\n".join([
        "User-agent: *",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /uk/api/",
        "Disallow: /search/",
        "Disallow: /uk/search/",
        "Disallow: /thanks/",
        "Disallow: /uk/thanks/",
        "",
        f"Sitemap: {domain}/sitemap.xml",
        "",
    ])
    return Response(body, mimetype="text/plain")
