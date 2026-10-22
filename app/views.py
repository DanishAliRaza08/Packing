"""Public pages. This blueprint is registered twice: US at / and UK at /uk/."""

import re

from flask import (Blueprint, abort, current_app, g, redirect, render_template,
                   request)

from . import db
from . import current_market, format_money, localise, market_url
from .content.blog import AUTHOR, POSTS
from .content.catalog import (FAQ_GROUPS, FINISHES, HOME_FAQ_COUNT, HOW_IT_WORKS,
                              MATERIAL_LABELS, NICHES, PRINT_LABELS, PRODUCTS,
                              STYLE_LABELS, TRUST_POINTS)
from .mailer import send_email
from .pages import STATIC_PAGES, all_pages
from .pricing import EstimateError, estimate, from_price_table, lowest_price
from .security import (UploadError, check_csrf, client_ip, is_bot, rate_limited,
                       save_upload)

bp = Blueprint("site", __name__)

PRODUCTS_BY_SLUG = {p["slug"]: p for p in PRODUCTS}
NICHES_BY_SLUG = {n["slug"]: n for n in NICHES}
POSTS_BY_SLUG = {p["slug"]: p for p in POSTS}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SOURCES = ["Google search", "Instagram", "LinkedIn", "Etsy or Shopify community", "Referral from a friend", "Other"]
COLOUR_OPTIONS = ["One colour", "Two colours", "Full colour (CMYK)"]
QUOTE_STYLES = list(STYLE_LABELS) + ["addons", "not-sure"]


def page_meta(endpoint):
    title, desc = STATIC_PAGES[endpoint]
    return {"title": localise(title), "description": localise(desc)}


def main_niche():
    return NICHES_BY_SLUG[current_app.config["SITE"]["main_niche"]]


def breadcrumbs(*items):
    """items are (label, url) pairs after Home."""
    return [("Home", market_url("home"))] + list(items)


# ---------------------------------------------------------------- core pages

@bp.route("/")
def home():
    site = current_app.config["SITE"]
    cfg = current_app.config["PRICING"]
    niches = [NICHES_BY_SLUG[s] for s in [site["main_niche"]] + site["secondary_niches"] if s in NICHES_BY_SLUG]
    faqs = [q for _, group in FAQ_GROUPS for q in group][:HOME_FAQ_COUNT]
    from_prices = {p["slug"]: lowest_price(p["style"], current_market(), cfg)[0] for p in PRODUCTS if p["style"]}
    return render_template(
        "home.html", meta=page_meta("home"), niche=main_niche(), niches=niches,
        products=PRODUCTS, from_prices=from_prices, steps=HOW_IT_WORKS,
        trust=TRUST_POINTS, faqs=faqs,
    )


@bp.route("/<slug>/")
def product(slug):
    p = PRODUCTS_BY_SLUG.get(slug)
    if not p:
        abort(404)
    cfg = current_app.config["PRICING"]
    table = from_price_table(p["style"], current_market(), cfg) if p["style"] else []
    materials = [(k, MATERIAL_LABELS[k]) for k in cfg["styles"][p["style"]]["materials"]] if p["style"] else []
    price_range = lowest_price(p["style"], current_market(), cfg) if p["style"] else None
    return render_template(
        "product.html", p=p, table=table, materials=materials, finishes=FINISHES,
        price_range=price_range, niches=[NICHES_BY_SLUG[s] for s in p["niches"]],
        others=[o for o in PRODUCTS if o["slug"] != slug],
        meta={"title": localise(p["title"]), "description": localise(p["description"])},
        crumbs=breadcrumbs((localise(p["name"]), None)),
    )


@bp.route("/packaging-for-<slug>/")
def niche(slug):
    n = NICHES_BY_SLUG.get(slug)
    if not n:
        abort(404)
    styles = [(PRODUCTS_BY_SLUG[s], why) for s, why in n["styles"]]
    return render_template(
        "niche.html", n=n, styles=styles,
        others=[o for o in NICHES if o["slug"] != slug],
        meta={"title": localise(n["title"]), "description": localise(n["description"])},
        crumbs=breadcrumbs((f"Packaging for {n['short'].lower()}", None)),
    )


@bp.route("/pricing/")
def pricing():
    cfg = current_app.config["PRICING"]
    styles = [(k, localise(STYLE_LABELS[k]), cfg["styles"][k]) for k in cfg["styles"]]
    tables = {k: from_price_table(k, current_market(), cfg) for k in cfg["styles"]}
    return render_template(
        "pricing.html", meta=page_meta("pricing"), styles=styles, tables=tables,
        material_labels=MATERIAL_LABELS, print_labels=PRINT_LABELS,
        crumbs=breadcrumbs(("Price estimator", None)),
    )


@bp.route("/how-it-works/")
def how_it_works():
    return render_template("how_it_works.html", meta=page_meta("how_it_works"), steps=HOW_IT_WORKS,
                           crumbs=breadcrumbs(("How it works", None)))


@bp.route("/eco-materials/")
def eco():
    return render_template("eco.html", meta=page_meta("eco"), materials=MATERIAL_LABELS,
                           crumbs=breadcrumbs(("Eco materials", None)))


@bp.route("/about/")
def about():
    return render_template("about.html", meta=page_meta("about"), crumbs=breadcrumbs(("About", None)))


@bp.route("/faq/")
def faq():
    return render_template("faq.html", meta=page_meta("faq"), groups=FAQ_GROUPS,
                           crumbs=breadcrumbs(("FAQ", None)))


@bp.route("/blog/")
def blog():
    posts = [p for p in POSTS if current_market() in p["markets"]]
    return render_template("blog/index.html", meta=page_meta("blog"), posts=posts,
                           crumbs=breadcrumbs(("Blog", None)))


@bp.route("/blog/<slug>/")
def blog_post(slug):
    post = POSTS_BY_SLUG.get(slug)
    if not post or current_market() not in post["markets"]:
        abort(404)
    g.markets_available = post["markets"]
    related = [p for p in POSTS if p["slug"] != slug and current_market() in p["markets"]][:3]
    cfg = current_app.config["PRICING"]
    return render_template(
        f"blog/posts/{slug}.html", post=post, author=AUTHOR, related=related,
        product=PRODUCTS_BY_SLUG[post["product"]],
        mailer_table=from_price_table("mailer", current_market(), cfg),
        shipping_table=from_price_table("shipping", current_market(), cfg),
        meta={"title": localise(post["title"]), "description": localise(post["description"])},
        crumbs=breadcrumbs(("Blog", market_url("blog")), (localise(post["title"]), None)),
    )


@bp.route("/privacy-policy/", endpoint="privacy")
@bp.route("/terms-of-sale/", endpoint="terms")
@bp.route("/cookie-policy/", endpoint="cookies")
@bp.route("/shipping-returns/", endpoint="shipping")
def legal():
    name = request.endpoint.split(".", 1)[1]
    meta = page_meta(name)
    return render_template(f"legal/{name}.html", meta=meta, crumbs=breadcrumbs((meta["title"], None)))


@bp.route("/search/")
def search():
    q = request.args.get("q", "").strip()
    results = []
    if q:
        words = [w for w in re.split(r"\W+", q.lower()) if w]
        for endpoint, args, title, desc, _ in all_pages(current_market()):
            text = f"{localise(title)} {localise(desc)}".lower()
            score = sum(text.count(w) for w in words)
            if score:
                results.append((score, localise(title), localise(desc), market_url(endpoint, **args)))
        results.sort(key=lambda r: -r[0])
    return render_template("search.html", q=q, results=results,
                           meta={"title": "Search", "description": "Search the site."}, noindex=True)


# ---------------------------------------------------------------- forms

def _clean(name, limit=200):
    return request.form.get(name, "").strip()[:limit]


def _number(name):
    try:
        value = float(request.form.get(name, ""))
        return value if value > 0 else None
    except ValueError:
        return None


def _notify(quote_id, data):
    site = current_app.config["SITE"]
    owner = current_app.config["NOTIFY_EMAIL"] or site["contact"]["email"]
    lines = [f"{k}: {v}" for k, v in data.items() if v not in (None, "", 0) and k != "ip"]
    send_email(owner, f"New {data['kind']} request #{quote_id} from {data['name']}",
               "\n".join(lines), reply_to=data["email"])
    first_name = data["name"].split()[0] if data["name"] else "there"
    send_email(
        data["email"], f"We got your request — {site['brand_name']}",
        f"Hi {first_name},\n\nThanks for your {data['kind']} request (reference #{quote_id}). "
        f"{site['team']['lead_name']} will reply within a few business hours"
        + (f", with your free 3D mockup within {site['mockup_hours']} hours." if data["kind"] == "quote" else ".")
        + f"\n\nIf you need us sooner, reply to this email or message us on WhatsApp.\n\n"
        f"{site['team']['lead_name']}\n{site['brand_name']}\n{site['contact']['email']}",
    )


def _contact_fields(errors):
    data = {
        "name": _clean("name", 120), "company": _clean("company", 120),
        "email": _clean("email", 200), "phone": _clean("phone", 40),
        "country": _clean("country", 40), "postcode": _clean("postcode", 20),
        "message": _clean("message", 4000), "source": _clean("source", 60),
    }
    if not data["name"]:
        errors["name"] = "Please enter your name."
    if not EMAIL_RE.match(data["email"]):
        errors["email"] = "Please enter a valid email address."
    if request.form.get("consent") != "yes":
        errors["consent"] = "Please agree to the privacy policy so we can reply."
    return data


def _finish(kind, data):
    """Save a validated request, send emails and redirect to the thank-you page."""
    data.update(kind=kind, market=current_market(), ip=client_ip())
    quote_id = db.create_quote(data)
    _notify(quote_id, data)
    return redirect(market_url("thanks", kind=kind))


def _guard():
    """Common checks for every form. Returns a response to send instead, or None."""
    check_csrf()
    if is_bot():
        return redirect(market_url("thanks", kind="quote"))
    if rate_limited("forms"):
        return render_template("error.html", message="Too many requests. Please wait a few minutes or email us."), 429
    return None


@bp.route("/quote/", methods=["GET", "POST"])
def quote():
    errors, form = {}, request.form if request.method == "POST" else request.args
    if request.method == "POST":
        blocked = _guard()
        if blocked:
            return blocked
        data = _contact_fields(errors)
        style = _clean("style", 20)
        if style not in QUOTE_STYLES:
            errors["style"] = "Please choose a box style."
        qty = _number("quantity")
        if not qty or qty < 50:
            errors["quantity"] = "Please enter a quantity of at least 50."
        finishes = [f for f in request.form.getlist("finishes") if f in dict(FINISHES)]
        data.update(
            style=style, length=_number("length"), width=_number("width"), height=_number("height"),
            unit="cm" if current_market() == "uk" else "in", quantity=int(qty or 0),
            material=_clean("material", 30), print_sides=_clean("print_sides", 20),
            colours=_clean("colours", 40), finishes=", ".join(finishes),
            design_help=1 if request.form.get("design_help") == "yes" else 0,
            deadline=_clean("deadline", 20),
        )
        if not errors:
            try:
                data["artwork_name"], data["artwork_file"] = save_upload(
                    request.files.get("artwork"), current_app.config["UPLOAD_DIR"])
            except UploadError as exc:
                errors["artwork"] = str(exc)
        if not errors:
            if data["length"] and data["width"] and data["height"] and style in current_app.config["PRICING"]["styles"]:
                try:
                    est = estimate(style, [data["length"], data["width"], data["height"]], data["quantity"],
                                   material=data["material"] or None, sides=data["print_sides"] or "outside",
                                   market=current_market(), cfg=current_app.config["PRICING"])
                    data.update(estimate_low=est["total_low"], estimate_high=est["total_high"], currency=est["currency"])
                except EstimateError:
                    pass
            return _finish("quote", data)

    return render_template(
        "quote.html", meta=page_meta("quote"), errors=errors, form=form,
        styles=[(k, localise(STYLE_LABELS[k])) for k in STYLE_LABELS],
        materials=MATERIAL_LABELS, print_labels=PRINT_LABELS, colours=COLOUR_OPTIONS,
        finishes=FINISHES, sources=SOURCES, crumbs=breadcrumbs(("Get a quote", None)),
    ), (400 if errors else 200)


@bp.route("/samples/", methods=["GET", "POST"])
def samples():
    errors, form = {}, request.form
    if request.method == "POST":
        blocked = _guard()
        if blocked:
            return blocked
        data = _contact_fields(errors)
        data["material"] = ", ".join(m for m in request.form.getlist("samples") if m in MATERIAL_LABELS)
        if not data["material"]:
            errors["samples"] = "Please choose at least one sample."
        if not errors:
            return _finish("sample", data)
    return render_template("samples.html", meta=page_meta("samples"), errors=errors, form=form,
                           materials=MATERIAL_LABELS, crumbs=breadcrumbs(("Samples", None))), (400 if errors else 200)


@bp.route("/contact/", methods=["GET", "POST"])
def contact():
    errors, form = {}, request.form
    if request.method == "POST":
        blocked = _guard()
        if blocked:
            return blocked
        data = _contact_fields(errors)
        if not data["message"]:
            errors["message"] = "Please write a short message."
        if not errors:
            return _finish("contact", data)
    return render_template("contact.html", meta=page_meta("contact"), errors=errors, form=form,
                           crumbs=breadcrumbs(("Contact", None))), (400 if errors else 200)


@bp.route("/thanks/<kind>/")
def thanks(kind):
    if kind not in ("quote", "sample", "contact"):
        abort(404)
    events = {"quote": "quote_submitted", "sample": "sample_requested", "contact": "contact_submitted"}
    return render_template("thanks.html", kind=kind, event=events[kind], noindex=True,
                           meta={"title": "Thank you", "description": "We received your request."})


@bp.route("/api/estimate", methods=["POST"])
def api_estimate():
    body = request.get_json(silent=True) or {}
    try:
        est = estimate(
            body.get("style"), [body.get("length"), body.get("width"), body.get("height")],
            body.get("quantity"), material=body.get("material") or None,
            sides=body.get("sides") or "outside", market=current_market(),
            cfg=current_app.config["PRICING"],
        )
    except EstimateError as exc:
        return {"ok": False, "error": str(exc)}, 400
    est.update(
        ok=True,
        per_box=f"{format_money(est['per_box_low'])}–{format_money(est['per_box_high'])}",
        total=f"{format_money(est['total_low'])}–{format_money(est['total_high'])}",
    )
    return est
