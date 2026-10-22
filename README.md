# Freestyle Packing — freestylepacking.shop

The marketing and quoting website for the custom packaging brokerage in the business plan: a US site at `/` and a UK site at `/uk/`, a **3D Box Studio** with 45 designs visitors can spin, open and customise, an instant price estimator, a three-step quote form with artwork upload, and a password-protected admin page for managing quote requests.

Built with Flask (Python) and SQLite. The front end is plain HTML, CSS and JavaScript, with [Three.js](https://threejs.org) for the 3D boxes and [GSAP](https://gsap.com) for animation. Both libraries are stored in `app/static/vendor/`, so there is no build step and nothing loads from a CDN.

**Contents**
1. [Before you launch: what to change](#1-before-you-launch-what-to-change)
2. [Run it on your computer](#2-run-it-on-your-computer)
3. [Daily use: the admin page](#3-daily-use-the-admin-page)
4. [Editing content](#4-editing-content)
   - [The 3D Box Studio and designs](#the-3d-box-studio-and-designs)
5. [Prices and the estimator](#5-prices-and-the-estimator)
6. [Put it live](#6-put-it-live)
7. [SEO and analytics](#7-seo-and-analytics)
8. [Which file does what](#8-which-file-does-what)

---

## 1. Before you launch: what to change

Everything marked `[in square brackets]` is a placeholder.

| What | Where |
|---|---|
| Phone, WhatsApp, US address, team names (brand, domain and email are already set) | `app/content/site.json` |
| Main niche (currently `candles`) and the other niches | `app/content/site.json` → `main_niche`, `secondary_niches` |
| Prices: replace them with real factory quotes | `app/content/pricing.json` |
| GBP exchange rate | `app/content/pricing.json` → `markets.uk.rate` |
| Photos: every kraft box drawing says "Replace with real photo" | see [Photos](#photos) |
| Testimonials: placeholders on the home page | `app/templates/home.html` (use **real** reviews only) |
| "Why we started" on the About page | `app/templates/about.html` |
| Legal pages: starter text, have a lawyer review | `app/templates/legal/` |
| Company legal name and state in Terms/Privacy | `app/templates/legal/terms.html`, `privacy.html` |
| Admin password, secret key, email settings | `.env` (see `.env.example`) |

Before you go live, check that "Freestyle Packing" doesn't conflict with an existing trademark in the US or UK.

## 2. Run it on your computer

You need Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env               # then edit .env
```

For local testing over plain `http`, set `SESSION_COOKIE_SECURE=0` and `ADMIN_PASSWORD=something` in `.env`. Then run:

```bash
python run.py
```

Open http://127.0.0.1:5000 for the US site and http://127.0.0.1:5000/uk/ for the UK site.

Run the tests:

```bash
python -m pytest
```

The database (`instance/quotes.db`) and uploaded artwork (`instance/uploads/`) are created automatically.

## 3. Daily use: the admin page

Go to `/admin/` and log in with `ADMIN_PASSWORD`.

- **Requests list:** every quote, sample and contact request, newest first. Filter by status (New, Mockup sent, Quoted, Won, Lost) or by type.
- **Request page:** all the details, the estimated price, a download link for the artwork, a status menu and private notes.
- **Export CSV:** downloads the current list for your quote spreadsheet. The plan's target is a 20–30% quote-to-order rate.

Every new request is also emailed to `NOTIFY_EMAIL`, and the customer gets a confirmation email. If SMTP isn't set up yet, nothing is emailed, but requests are still saved and shown in admin.

## 4. Editing content

| Content | File |
|---|---|
| Product pages (mailer, shipping, product, rigid boxes, add-ons): text, sizes, FAQs | `app/content/catalog.py` → `PRODUCTS` |
| Industry pages (`/packaging-for-candles/` and so on) | `app/content/catalog.py` → `NICHES` |
| FAQ page (30+ questions in groups) | `app/content/catalog.py` → `FAQ_GROUPS` |
| US/UK wording (color/colour, mailer/postal boxes, ZIP/postcode) | `app/content/catalog.py` → `LOCALE` |
| Page titles and meta descriptions for fixed pages | `app/pages.py` |
| Blog post list | `app/content/blog.py` |
| Blog post text | `app/templates/blog/posts/<slug>.html` |

**US and UK text.** Any text in `catalog.py` can be a plain string or `{"us": "...", "uk": "..."}`. Sizes are written once in inches and the UK site shows centimetres automatically. Prices show in $ or £ automatically.

**Placeholders in text.** `{min}`, `{hours}`, `{days}` and `{custom_from}` are filled in from `site.json`, so changing your minimum order there updates every page.

**Add a new industry page.** Copy one of the entries in `NICHES`, change the `slug` (for example `tea`), then add the slug to `secondary_niches` in `site.json`. The page appears at `/packaging-for-tea/` and `/uk/packaging-for-tea/`, in the menu, and in the sitemap.

**Add a blog post.**
1. Add an entry to `POSTS` in `app/content/blog.py`. Use `"markets": ["us", "uk"]` for both sites or `["uk"]` for UK only.
2. Create `app/templates/blog/posts/<slug>.html`. Copy an existing post. Inside a post, `{{ money(1.40) }}` shows a price in the right currency, `{{ dims([9, 6, 3]) }}` shows a size in inches or cm, and `{{ t.colour }}` gives US or UK spelling.

### The 3D Box Studio and designs

The studio is at `/box-studio/` (and `/uk/box-studio/`, which shows sizes in cm). Visitors can:

- browse 45 designs and filter them by box style or industry,
- drag to spin, scroll or pinch to zoom, and open and close the box with an animation,
- change the board colour, pattern (18 to choose from), pattern colour, finish (matte, soft-touch or gloss), inside colour and size,
- type their brand name (in sans, serif or italic lettering, in ink or gold, silver or rose-gold foil), or upload their own logo, which stays in their browser and is never uploaded,
- download a PNG mockup, copy a link to the design, and click **Get a quote for this design**. This opens the quote form already filled in with the style, size and a summary of every choice; the summary is saved with the request and shown in admin.

The same 3D boxes appear on the home page (the lid opens as you scroll), on every product and industry page, and as thumbnails across the site, in place of placeholder photos.

There are six box styles, each built and animated in 3D: `mailer`, `shipping` (flap-top carton with four flaps and tape), `tuck` (product carton), `rigid` (lid and base), `drawer` (sleeve with a sliding tray) and `magnetic` (book-style flap).

**Add or change a design:** edit `app/content/designs.json` and restart. Each design looks like this:

```json
{
  "id": "botanical-candle-mailer",
  "name": "Botanical Candle Mailer",
  "style": "mailer",
  "niches": ["candles"],
  "dims": [8, 8, 4],
  "board": "#2f4a3a",
  "pattern": {"type": "botanical", "color": "#5e8064", "color2": "#3d5d49", "scale": 1},
  "logo": {"text": "Ember & Oak", "color": "#efe4cf", "font": "serif", "foil": "gold"},
  "inside": "#e9dcc3",
  "insidePrint": true,
  "finish": "soft",
  "description": "Deep green with tone-on-tone leaves and a gold foil wordmark, printed inside too."
}
```

- `dims` are inside length × width × height in inches.
- `pattern.type` is one of: solid, stripes, diagonal, dots, grid, waves, chevron, checker, terrazzo, botanical, confetti, rays, halftone, triangles, marble, topo, stars, scallop. `scale` makes the pattern bigger or smaller.
- `font` is `sans`, `serif` or `script`; `foil` is `gold`, `silver`, `rose` or `null` for ink.
- `finish` is `matte`, `soft` or `gloss`.
- Colours must be 6-digit hex codes like `#1e1e20`.
- The brand names on the designs are made-up examples.

Change which design opens on the home page with `hero_design` in `site.json`. The 3D code is in `app/static/js/box3d/`: `textures.js` paints patterns and logos, `models.js` builds and animates each box style, and `viewer.js` handles the scene, camera and thumbnails.

Older browsers and devices without 3D graphics see the standard drawings instead, and visitors who have turned on "reduce motion" get no auto-spin or scroll animations.

### Photos

Most pictures on the site are now 3D renders. The remaining kraft box drawings (the team photo, the industry page galleries and the 3D fallback) are placeholders from the `photo()` macro in `app/templates/partials/macros.html`. To use real photos:

1. Save each photo as WebP (around 1600 px wide, under 200 KB) in `app/static/img/`.
2. Replace `{{ ui.photo(...) }}` in the template with:
   ```html
   <img src="{{ url_for('static', filename='img/candle-mailer.webp') }}"
        width="1600" height="1200" loading="lazy" alt="Kraft candle mailer box with gold foil logo">
   ```
   Leave out `loading="lazy"` for the large picture at the top of a page.
3. Replace `app/static/img/share.png` (1200 × 630) with your own social share image, and `logo.svg` / `favicon.svg` with your logo.

## 5. Prices and the estimator

All prices are in `app/content/pricing.json`:

- `quantity_tiers` are US dollar prices per box for the reference mailer box (`reference_size_in`, kraft E-flute, printed outside). They come from the business plan's price table.
- `styles`, `materials` and `print_sides` multiply those prices.
- `size_exponent` controls how fast price rises with box size.
- `markets.uk.rate` converts to GBP.

The same numbers drive the `/pricing/` estimator, the "from" price tables on product pages, the blog price tables and the estimate saved with each quote. Change the file and restart the site.

The plan's open question still applies: get real quotes from 2–3 factories to confirm your landed cost (about $0.85 per box in the plan's example) before you quote clients.

## 6. Put it live

The site runs anywhere Python runs. These are the simplest options.

### Render or Railway

1. Push this repository to GitHub.
2. Create a new **Web Service** from the repository.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT --workers 1 --threads 4` (also in the `Procfile`).
5. Add the variables from `.env.example` in the dashboard, with a long random `SECRET_KEY`, `ADMIN_PASSWORD`, `SMTP_*` and `TRUST_PROXY=1`.
6. **Add a persistent disk** mounted at, for example, `/data`, and set `DATABASE_PATH=/data/quotes.db` and `UPLOAD_DIR=/data/uploads`. Without a disk, quotes and artwork are lost on every deploy.
7. Point `freestylepacking.shop` (and `www.freestylepacking.shop`) at the service and turn on HTTPS. The domain is already set in `site.json`, and is used for canonical links, the sitemap and social sharing.
8. Set up email for `hello@freestylepacking.shop` with your email provider, and use its SMTP details in the `SMTP_*` settings.

### A VPS (Ubuntu)

Run gunicorn behind Nginx with HTTPS from Let's Encrypt. Set `client_max_body_size 26M;` in Nginx so 25 MB artwork uploads work, and run gunicorn as a systemd service.

**Use one worker.** Form rate limiting is kept in memory, so it only works across one process. One worker with several threads is plenty for this site. If you outgrow it, move rate limiting to Redis or use Cloudflare Turnstile.

### Moving to PostgreSQL later

All database code is in `app/db.py` and uses plain SQL. To switch, replace `sqlite3.connect` with a PostgreSQL connection (for example `psycopg`), change `?` placeholders to `%s`, and change `INTEGER PRIMARY KEY AUTOINCREMENT` to `SERIAL PRIMARY KEY`.

## 7. SEO and analytics

Already built in:

- A unique title (under 60 characters) and meta description on every page, one H1, and clean URLs with trailing slashes.
- Canonical tags, and `hreflang` tags linking each US page to its UK version (`en-us`, `en-gb`, `x-default`).
- JSON-LD schema: Organization, WebSite, BreadcrumbList on inner pages, Product with a price range on product pages, FAQPage on every FAQ block and Article on blog posts.
- `/sitemap.xml` (generated automatically, with hreflang alternates) and `/robots.txt`.
- Open Graph and Twitter card tags with a default share image.
- Breadcrumbs, internal links between products, industries and blog posts, and a 404 page with search.

**Analytics** (Google Analytics 4 and Microsoft Clarity) only load after a visitor clicks "Accept analytics" on the cookie banner. Add your IDs in `site.json` → `analytics`. These events are sent to GA4: `quote_submitted`, `estimator_used`, `sample_requested`, `whatsapp_clicked`, `contact_submitted`, `design_selected` and `studio_quote_clicked`. Mark `quote_submitted` as a key event (conversion) in GA4.

**Google Search Console:** paste the verification code (only the `content="..."` value) into `analytics.search_console_verification`, then submit `https://yourdomain.com/sitemap.xml`. Do the same in Bing Webmaster Tools.

After launch, follow the plan's SEO routine: two helpful articles a week, one new industry page a month, and a monthly check of Search Console.

## 8. Which file does what

```
run.py                       Start the site locally
Procfile                     Start command for Render / Railway / Heroku-style hosts
.env.example                 Settings template (copy to .env)
app/
  __init__.py                Creates the app, US + UK sites, template helpers, security headers
  config.py                  Reads settings from .env
  views.py                   Public pages, 3D studio, quote / sample / contact forms, estimator API
  designs.py                 Loads and checks the 3D designs
  admin.py                   /admin: login, request list, status, artwork download, CSV export
  seo.py                     sitemap.xml and robots.txt
  pages.py                   List of all pages with titles and descriptions
  pricing.py                 Price estimator maths
  db.py                      SQLite database
  mailer.py                  Sends emails by SMTP
  security.py                CSRF tokens, honeypot, rate limiting, upload checks
  content/
    site.json                Your business details
    pricing.json             All prices
    designs.json             The 45 3D box designs
    catalog.py               Products, industries, FAQs, US/UK wording
    blog.py                  Blog post list
  templates/
    base.html                Header, footer, SEO tags, cookie banner (every page)
    partials/macros.html     Reusable pieces: photo placeholder, FAQ block, price table, form fields
    home.html, product.html, niche.html, studio.html, pricing.html, quote.html, ...
    blog/                    Blog index, post layout and posts
    legal/                   Privacy, terms, cookies, shipping & returns
    admin/                   Admin pages
  static/
    css/site.css             All styles; brand colours at the top
    js/site.js               Mobile menu, cookie consent, analytics events
    js/estimator.js          Live price estimator
    js/quote.js              Three-step quote form
    js/motion.js             GSAP animations (scroll reveals, counters, hero)
    js/studio.js             3D Box Studio controls and gallery
    js/box3d/                3D engine: textures.js, models.js, viewer.js, auto.js
    vendor/three/            Three.js r169 (MIT licence)
    vendor/gsap/             GSAP 3.12.5 and ScrollTrigger
    img/                     Logo, favicon, share image
tests/test_site.py           Automated tests
```

**Security notes.** Forms use CSRF tokens, a hidden honeypot field and rate limiting. Uploads are limited to 25 MB and to PDF, AI, EPS, SVG, PNG and JPG files, with a check that the file really is that type. They're stored under random names outside the public folder and can only be downloaded from admin. CSV exports escape values that start with `=`, `+`, `-` or `@` so spreadsheets don't run them as formulas.
