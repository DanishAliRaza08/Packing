import html as htmllib
import io
import json
import re

import pytest
from flask import url_for

from app import create_app
from app.pages import all_pages
from app.pricing import EstimateError, estimate, load_pricing
from app.security import limiter


@pytest.fixture
def app(tmp_path):
    limiter.hits.clear()
    app = create_app({
        "TESTING": True,
        "DATABASE": str(tmp_path / "test.db"),
        "UPLOAD_DIR": str(tmp_path / "uploads"),
        "ADMIN_PASSWORD": "secret-pass",
        "SESSION_COOKIE_SECURE": False,
        "RATE_LIMIT_COUNT": 50,
    })
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def csrf(client, path):
    html = client.get(path).data.decode()
    return re.search(r'name="_csrf" value="([^"]+)"', html).group(1)


def all_urls(app):
    with app.test_request_context():
        return [url_for(f"{m}.{ep}", **args) for m in ("us", "uk") for ep, args, *_ in all_pages(m)]


def test_every_page_renders_with_seo_basics(app, client):
    for url in all_urls(app):
        resp = client.get(url)
        assert resp.status_code == 200, url
        html = resp.data.decode()
        title = htmllib.unescape(re.search(r"<title>(.*?)</title>", html).group(1))
        assert len(title) <= 60, (url, title)
        assert len(re.findall(r"<h1[ >]", html)) == 1, url
        assert 'rel="canonical"' in html
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            json.loads(block)


def test_uk_pages_use_uk_wording_and_currency(client):
    html = client.get("/uk/custom-mailer-boxes/").data.decode()
    assert 'lang="en-GB"' in html
    assert "£" in html and "cm" in html
    assert 'hreflang="en-us" href="https://freestylepacking.shop/custom-mailer-boxes/"' in html
    us = client.get("/custom-mailer-boxes/").data.decode()
    assert "$" in us and "color" in us


def test_uk_only_post_is_missing_on_us_site(client):
    assert client.get("/uk/blog/uk-packaging-epr-explained/").status_code == 200
    assert client.get("/blog/uk-packaging-epr-explained/").status_code == 404


def test_sitemap_and_robots(app, client):
    xml = client.get("/sitemap.xml").data.decode()
    for url in all_urls(app):
        assert f"https://freestylepacking.shop{url}" in xml
    robots = client.get("/robots.txt").data.decode()
    assert "Disallow: /admin/" in robots and "sitemap.xml" in robots


def test_404_page(client):
    resp = client.get("/no-such-page/")
    assert resp.status_code == 404
    assert b"can't find that page" in resp.data


def test_estimate_maths():
    cfg = load_pricing()
    est = estimate("mailer", [9, 6, 3], 500, cfg=cfg)
    assert (est["per_box_low"], est["per_box_high"]) == (1.5, 1.8)
    assert est["total_low"] == 750
    uk = estimate("mailer", [9 * 2.54, 6 * 2.54, 3 * 2.54], 500, market="uk", cfg=cfg)
    assert uk["currency"] == "GBP"
    assert uk["per_box_low"] == round(1.5 * cfg["markets"]["uk"]["rate"], 2)
    assert estimate("mailer", [9, 6, 3], 2500, cfg=cfg)["per_box_low"] < est["per_box_low"]
    with pytest.raises(EstimateError):
        estimate("mailer", [9, 6, 3], 10, cfg=cfg)
    with pytest.raises(EstimateError):
        estimate("rigid", [9, 6, 3], 500, material="kraft-e", cfg=cfg)


def test_estimate_api(client):
    ok = client.post("/api/estimate", json={"style": "mailer", "length": 9, "width": 6, "height": 3, "quantity": 500})
    assert ok.status_code == 200 and ok.json["per_box"] == "$1.50–$1.80"
    bad = client.post("/api/estimate", json={"style": "mailer", "quantity": 5})
    assert bad.status_code == 400 and not bad.json["ok"]


def quote_form(token, **extra):
    data = {
        "_csrf": token, "style": "mailer", "length": "9", "width": "6", "height": "3",
        "quantity": "500", "print_sides": "outside", "name": "Test Buyer",
        "email": "buyer@example.com", "consent": "yes",
    }
    data.update(extra)
    return data


def login(client):
    token = csrf(client, "/admin/login")
    return client.post("/admin/login", data={"_csrf": token, "password": "secret-pass"})


def test_quote_submission_saved_with_artwork(client):
    token = csrf(client, "/quote/")
    data = quote_form(token, artwork=(io.BytesIO(b"%PDF-1.4 test"), "logo.pdf"))
    resp = client.post("/quote/", data=data, content_type="multipart/form-data")
    assert resp.status_code == 302 and "/thanks/quote/" in resp.headers["Location"]

    login(client)
    listing = client.get("/admin/").data.decode()
    assert "Test Buyer" in listing and "750" in listing
    detail = client.get("/admin/quote/1").data.decode()
    assert "logo.pdf" in detail
    assert client.get("/admin/quote/1/artwork").data.startswith(b"%PDF")


def test_quote_validation_errors(client):
    token = csrf(client, "/quote/")
    resp = client.post("/quote/", data=quote_form(token, email="nope", consent=""))
    assert resp.status_code == 400
    html = resp.data.decode()
    assert "valid email" in html and "privacy policy so we can reply" in html


def test_upload_rejects_fake_file(client):
    token = csrf(client, "/quote/")
    data = quote_form(token, artwork=(io.BytesIO(b"MZ not a pdf"), "logo.pdf"))
    resp = client.post("/quote/", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400 and b"look like a real PDF" in resp.data
    data = quote_form(token, artwork=(io.BytesIO(b"hello"), "run.exe"))
    assert client.post("/quote/", data=data, content_type="multipart/form-data").status_code == 400


def test_honeypot_and_csrf(client):
    token = csrf(client, "/quote/")
    resp = client.post("/quote/", data=quote_form(token, website="http://spam"))
    assert resp.status_code == 302
    login(client)
    assert "Test Buyer" not in client.get("/admin/").data.decode()
    assert client.post("/quote/", data=quote_form("wrong")).status_code == 400


def test_rate_limit(app, client):
    app.config["RATE_LIMIT_COUNT"] = 2
    token = csrf(client, "/contact/")
    form = {"_csrf": token, "name": "A", "email": "a@example.com", "message": "Hi", "consent": "yes"}
    assert client.post("/contact/", data=form).status_code == 302
    assert client.post("/contact/", data=form).status_code == 302
    assert client.post("/contact/", data=form).status_code == 429


def test_samples_and_uk_quote(client):
    token = csrf(client, "/uk/samples/")
    resp = client.post("/uk/samples/", data={"_csrf": token, "name": "B", "email": "b@example.com",
                                             "consent": "yes", "samples": ["kraft-e", "white-e"]})
    assert resp.status_code == 302 and resp.headers["Location"].startswith("/uk/thanks/sample/")


def test_admin_requires_login_and_updates_status(client):
    assert client.get("/admin/").status_code == 302
    token = csrf(client, "/admin/login")
    bad = client.post("/admin/login", data={"_csrf": token, "password": "wrong"})
    assert b"Wrong password" in bad.data

    token = csrf(client, "/quote/")
    client.post("/quote/", data=quote_form(token, name="=HYPERLINK(1)"))
    login(client)
    token = csrf(client, "/admin/quote/1")
    client.post("/admin/quote/1", data={"_csrf": token, "status": "Quoted", "notes": "sent quote"})
    assert "Quoted" in client.get("/admin/?status=Quoted").data.decode()

    csv_text = client.get("/admin/export.csv").data.decode()
    assert "'=HYPERLINK(1)" in csv_text and "sent quote" in csv_text


def test_admin_disabled_without_password(app, client):
    app.config["ADMIN_PASSWORD"] = ""
    assert client.get("/admin/").status_code == 403


def test_designs_file_has_40_plus_valid_designs():
    from app.designs import PATTERNS, STYLES, load_designs
    designs = load_designs()
    assert len(designs) >= 40
    assert len({d["id"] for d in designs}) == len(designs)
    assert {d["style"] for d in designs} == set(STYLES)
    for d in designs:
        assert d["pattern"]["type"] in PATTERNS
        assert len(d["dims"]) == 3 and all(v > 0 for v in d["dims"])
        for colour in (d["board"], d["inside"], d["logo"]["color"], d["pattern"]["color"]):
            assert re.fullmatch(r"#[0-9a-fA-F]{6}", colour), (d["id"], colour)


def test_studio_page_lists_every_design(app, client):
    html = client.get("/box-studio/").data.decode()
    designs = app.config["DESIGNS"]
    assert html.count("data-design-card=") == len(designs)
    data = json.loads(re.search(r'<script type="application/json" id="box-designs">(.*?)</script>', html, re.S).group(1))
    assert len(data) == len(designs)
    assert 'type="importmap"' in html and "three.module.min.js" in html
    uk = client.get("/uk/box-studio/").data.decode()
    assert 'data-unit="cm"' in uk


def test_3d_viewers_on_home_product_and_niche_pages(client):
    for url in ["/", "/custom-mailer-boxes/", "/rigid-gift-boxes/", "/packaging-for-candles/"]:
        html = client.get(url).data.decode()
        assert "data-box3d=" in html and "box3d/auto.js" in html, url
    assert "box3d/auto.js" not in client.get("/faq/").data.decode()


def test_quote_keeps_chosen_3d_design(client):
    page = client.get("/quote/?design=Botanical%20Candle%20Mailer%20(botanical-candle-mailer)").data.decode()
    assert "Your 3D design:" in page
    token = csrf(client, "/quote/")
    client.post("/quote/", data=quote_form(token, design="Botanical Candle Mailer (botanical-candle-mailer)"))
    login(client)
    assert "botanical-candle-mailer" in client.get("/admin/quote/1").data.decode()


def test_old_database_gets_design_column(tmp_path):
    import sqlite3
    path = tmp_path / "old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, status TEXT, kind TEXT, name TEXT, email TEXT)")
    con.commit()
    con.close()
    create_app({"TESTING": True, "DATABASE": str(path), "UPLOAD_DIR": str(tmp_path / "u")})
    cols = {r[1] for r in sqlite3.connect(path).execute("PRAGMA table_info(quotes)")}
    assert "design" in cols
