# Custom Printed Packaging — Website

The marketing and quoting website for the custom packaging brokerage in the business plan: a US site at `/` and a UK site at `/uk/`, an instant price estimator, a three-step quote form with artwork upload, and a password-protected admin page for managing quote requests.

Built with Flask (Python) and SQLite, with plain HTML, CSS and JavaScript on the front end. There is no build step.

**Contents**
1. [Before you launch: what to change](#1-before-you-launch-what-to-change)
2. [Run it on your computer](#2-run-it-on-your-computer)
3. [Daily use: the admin page](#3-daily-use-the-admin-page)
4. [Editing content](#4-editing-content)
5. [Prices and the estimator](#5-prices-and-the-estimator)
6. [Put it live](#6-put-it-live)
7. [SEO and analytics](#7-seo-and-analytics)
8. [Which file does what](#8-which-file-does-what)

---

## 1. Before you launch: what to change

Everything marked `[in square brackets]` is a placeholder.

| What | Where |
|---|---|
| Brand name, domain, email, phone, WhatsApp, US address, team names | `app/content/site.json` |
| Main niche (currently `candles`) and the other niches | `app/content/site.json` → `main_niche`, `secondary_niches` |
| Prices: replace them with real factory quotes | `app/content/pricing.json` |
| GBP exchange rate | `app/content/pricing.json` → `markets.uk.rate` |
| Photos: every kraft box drawing says "Replace with real photo" | see [Photos](#photos) |
| Testimonials: placeholders on the home page | `app/templates/home.html` (use **real** reviews only) |
| "Why we started" on the About page | `app/templates/about.html` |
| Legal pages: starter text, have a lawyer review | `app/templates/legal/` |
| Company legal name and state in Terms/Privacy | `app/templates/legal/terms.html`, `privacy.html` |
| Admin password, secret key, email settings | `.env` (see `.env.example`) |

Before you go live, check the brand name and `.com` are free and don't conflict with a trademark.

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

### Photos

The kraft box drawings are placeholders from the `photo()` macro in `app/templates/partials/macros.html`. To use real photos:

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
7. Point your domain at the service and turn on HTTPS. Update `domain` in `site.json`.

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

**Analytics** (Google Analytics 4 and Microsoft Clarity) only load after a visitor clicks "Accept analytics" on the cookie banner. Add your IDs in `site.json` → `analytics`. These events are sent to GA4: `quote_submitted`, `estimator_used`, `sample_requested`, `whatsapp_clicked` and `contact_submitted`. Mark `quote_submitted` as a key event (conversion) in GA4.

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
  views.py                   Public pages, quote / sample / contact forms, estimator API
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
    catalog.py               Products, industries, FAQs, US/UK wording
    blog.py                  Blog post list
  templates/
    base.html                Header, footer, SEO tags, cookie banner (every page)
    partials/macros.html     Reusable pieces: photo placeholder, FAQ block, price table, form fields
    home.html, product.html, niche.html, pricing.html, quote.html, ...
    blog/                    Blog index, post layout and posts
    legal/                   Privacy, terms, cookies, shipping & returns
    admin/                   Admin pages
  static/
    css/site.css             All styles; brand colours at the top
    js/site.js               Mobile menu, cookie consent, analytics events
    js/estimator.js          Live price estimator
    js/quote.js              Three-step quote form
    img/                     Logo, favicon, share image
tests/test_site.py           Automated tests
```

**Security notes.** Forms use CSRF tokens, a hidden honeypot field and rate limiting. Uploads are limited to 25 MB and to PDF, AI, EPS, SVG, PNG and JPG files, with a check that the file really is that type. They're stored under random names outside the public folder and can only be downloaded from admin. CSV exports escape values that start with `=`, `+`, `-` or `@` so spreadsheets don't run them as formulas.
