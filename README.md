# Freestyle Packing — freestylepacking.shop

The marketing and quoting website for the custom packaging brokerage in the business plan: a US site at `/` and a UK site at `/uk/`, a **3D Box Studio** with 45 designs visitors can spin, open and customise, an instant price estimator, a three-step quote form with artwork upload, and a password-protected admin page for managing quote requests.

Built with Node.js and Express, with Nunjucks page templates. It runs on Hostinger's Node.js web app hosting (Business and Cloud plans) or any other Node host. The front end is plain HTML, CSS and JavaScript, with [Three.js](https://threejs.org) for the 3D boxes and [GSAP](https://gsap.com) for animation. Both libraries are stored in `public/vendor/`, so there is no build step and nothing loads from a CDN. Quote requests are saved in a JSON file, so no database server is needed.

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
| Phone, WhatsApp, US address, team names (brand, domain and email are already set) | `src/content/site.json` |
| Main niche (currently `candles`) and the other niches | `src/content/site.json` → `main_niche`, `secondary_niches` |
| Prices: replace them with real factory quotes | `src/content/pricing.json` |
| GBP exchange rate | `src/content/pricing.json` → `markets.uk.rate` |
| Photos: every kraft box drawing says "Replace with real photo" | see [Photos](#photos) |
| Testimonials: placeholders on the home page | `views/home.html` (use **real** reviews only) |
| "Why we started" on the About page | `views/about.html` |
| Legal pages: starter text, have a lawyer review | `views/legal/` |
| Company legal name and state in Terms/Privacy | `views/legal/terms.html`, `privacy.html` |
| Admin password, secret key, email settings | `.env` (see `.env.example`) |

Before you go live, check that "Freestyle Packing" doesn't conflict with an existing trademark in the US or UK.

## 2. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env        # then edit .env
npm start
```

Open http://localhost:3000 for the US site and http://localhost:3000/uk/ for the UK site. Use `npm run dev` instead of `npm start` to restart automatically when you change a file.

Run the tests:

```bash
npm test
```

Quote requests are saved in `data/quotes.json` and uploaded artwork in `data/uploads/`. Both are created automatically.

## 3. Daily use: the admin page

Go to `/admin/` and log in with `ADMIN_PASSWORD`.

- **Requests list:** every quote, sample and contact request, newest first. Filter by status (New, Mockup sent, Quoted, Won, Lost) or by type.
- **Request page:** all the details, the estimated price, a download link for the artwork, a status menu and private notes.
- **Export CSV:** downloads the current list for your quote spreadsheet. The plan's target is a 20–30% quote-to-order rate.

Every new request is also emailed to `NOTIFY_EMAIL`, and the customer gets a confirmation email. If SMTP isn't set up yet, nothing is emailed, but requests are still saved and shown in admin.

## 4. Editing content

| Content | File |
|---|---|
| Product pages (mailer, shipping, product, rigid boxes, add-ons): text, sizes, FAQs | `src/content/catalog.json` → `PRODUCTS` |
| Industry pages (`/packaging-for-candles/` and so on) | `src/content/catalog.json` → `NICHES` |
| FAQ page (30+ questions in groups) | `src/content/catalog.json` → `FAQ_GROUPS` |
| US/UK wording (color/colour, mailer/postal boxes, ZIP/postcode) | `src/content/catalog.json` → `LOCALE` |
| Page titles and meta descriptions for fixed pages | `src/pages.js` |
| Blog post list | `src/content/blog.json` |
| Blog post text | `views/blog/posts/<slug>.html` |

**US and UK text.** Any text in `catalog.json` can be a plain string or `{"us": "...", "uk": "..."}`. Sizes are written once in inches and the UK site shows centimetres automatically. Prices show in $ or £ automatically.

**Placeholders in text.** `{min}`, `{hours}`, `{days}` and `{custom_from}` are filled in from `site.json`, so changing your minimum order there updates every page.

**Add a new industry page.** Copy one of the entries in `NICHES` in `catalog.json`, change the `slug` (for example `tea`), then add the slug to `secondary_niches` in `site.json`. The page appears at `/packaging-for-tea/` and `/uk/packaging-for-tea/`, in the menu, and in the sitemap.

**Add a blog post.**
1. Add an entry to `POSTS` in `src/content/blog.json`. Use `"markets": ["us", "uk"]` for both sites or `["uk"]` for UK only.
2. Create `views/blog/posts/<slug>.html`. Copy an existing post. Inside a post, `{{ money(1.40) }}` shows a price in the right currency, `{{ dims([9, 6, 3]) }}` shows a size in inches or cm, and `{{ t.colour }}` gives US or UK spelling.

### The 3D Box Studio and designs

The studio is at `/box-studio/` (and `/uk/box-studio/`, which shows sizes in cm). Visitors can:

- browse 45 designs and filter them by box style or industry,
- drag to spin, scroll or pinch to zoom, and open and close the box with an animation,
- change the board colour, pattern (18 to choose from), pattern colour, finish (matte, soft-touch or gloss), inside colour and size,
- type their brand name (in sans, serif or italic lettering, in ink or gold, silver or rose-gold foil), or upload their own logo, which stays in their browser and is never uploaded,
- download a PNG mockup, copy a link to the design, and click **Get a quote for this design**. This opens the quote form already filled in with the style, size and a summary of every choice; the summary is saved with the request and shown in admin.

The same 3D boxes appear on the home page (the lid opens as you scroll), on every product and industry page, and as thumbnails across the site, in place of placeholder photos.

There are six box styles, each built and animated in 3D: `mailer`, `shipping` (flap-top carton with four flaps and tape), `tuck` (product carton), `rigid` (lid and base), `drawer` (sleeve with a sliding tray) and `magnetic` (book-style flap).

**Add or change a design:** edit `src/content/designs.json` and restart. Each design looks like this:

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

Change which design opens on the home page with `hero_design` in `site.json`. The 3D code is in `public/js/box3d/`: `textures.js` paints patterns and logos, `models.js` builds and animates each box style, and `viewer.js` handles the scene, camera and thumbnails.

Older browsers and devices without 3D graphics see the standard drawings instead, and visitors who have turned on "reduce motion" get no auto-spin or scroll animations.

### Photos

Most pictures on the site are now 3D renders. The remaining kraft box drawings (the team photo, the industry page galleries and the 3D fallback) are placeholders from the `photo()` macro in `views/partials/macros.html`. To use real photos:

1. Save each photo as WebP (around 1600 px wide, under 200 KB) in `public/img/`.
2. Replace `{{ ui.photo(...) }}` in the template with:
   ```html
   <img src="{{ url_for('static', filename='img/candle-mailer.webp') }}"
        width="1600" height="1200" loading="lazy" alt="Kraft candle mailer box with gold foil logo">
   ```
   Leave out `loading="lazy"` for the large picture at the top of a page.
3. Replace `public/img/share.png` (1200 × 630) with your own social share image, and `logo.svg` / `favicon.svg` with your logo.

## 5. Prices and the estimator

All prices are in `src/content/pricing.json`:

- `quantity_tiers` are US dollar prices per box for the reference mailer box (`reference_size_in`, kraft E-flute, printed outside). They come from the business plan's price table.
- `styles`, `materials` and `print_sides` multiply those prices.
- `size_exponent` controls how fast price rises with box size.
- `markets.uk.rate` converts to GBP.

The same numbers drive the `/pricing/` estimator, the "from" price tables on product pages, the blog price tables and the estimate saved with each quote. Change the file and restart the site.

The plan's open question still applies: get real quotes from 2–3 factories to confirm your landed cost (about $0.85 per box in the plan's example) before you quote clients.

## 6. Put it live

### On Hostinger (Node.js web app)

You need a Business Web Hosting or Cloud plan, which include Node.js web apps.

1. **Make the zip.** Zip the *contents* of the project folder, so `package.json` sits at the top of the zip, not inside a folder. Leave out `node_modules`, `.git`, `data` and `.env`. From GitHub, the easiest way is to download the repository and re-zip the files inside the folder it creates.
2. In hPanel, go to **Websites → Add website → Node.js Apps** (or **Node.js** in your existing website's menu) and choose **Upload your website files**. Upload the zip.
3. Check the build settings Hostinger detects:
   - **Framework:** Express
   - **Node.js version:** 22.x (20.x and 24.x also work)
   - **Entry file:** `server.js`
   - **Build command:** leave empty (or `npm install` if it asks for one)
4. Add the **environment variables** from `.env.example`: at least `SECRET_KEY` (a long random string), `ADMIN_PASSWORD`, `TRUST_PROXY=1`, and the `SMTP_*` settings. You don't need to set `PORT`; Hostinger sets it.
5. Deploy, then connect **freestylepacking.shop** to the app and turn on SSL in hPanel. The domain is already set in `site.json` for canonical links, the sitemap and social sharing.
6. Create the mailbox `hello@freestylepacking.shop` in hPanel → Emails, and use it for the SMTP settings (`smtp.hostinger.com`, port 465).
7. Visit `/admin/` and log in with your `ADMIN_PASSWORD` to check it works, then send yourself a test quote.

**Keep your quote data safe.** Requests are saved in `data/quotes.json` on the server and emailed to you. Re-uploading a new zip may replace the app folder, so download a CSV from admin before each redeploy, or set `DATA_DIR` to a folder outside the app (ask Hostinger support which folder is kept between deploys). The emails are always your backup.

### Other hosts (Render, Railway, a VPS)

The app runs anywhere Node.js 20+ runs: install with `npm install`, start with `npm start`, and set the environment variables from `.env.example`. On Render or Railway, add a persistent disk and point `DATA_DIR` at it. On a VPS, run it with a process manager (such as pm2 or systemd) behind Nginx with HTTPS, and set `client_max_body_size 26M;` so 25 MB artwork uploads work.

**Run one copy of the app.** Form rate limiting and the quote file live in a single process. That's plenty for this site; if you ever need more, move storage to a database.

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
server.js                    Starts the site (Hostinger's entry file)
package.json                 Packages and the start/test commands
.env.example                 Settings template
src/
  app.js                     Builds the app: US + UK sites, admin, security headers
  config.js                  Reads settings from the environment
  templating.js              Page URLs, US/UK helpers and template filters
  routes/site.js             Public pages, 3D studio, quote / sample / contact forms, estimator API
  routes/admin.js            /admin: login, request list, status, artwork download, CSV export
  routes/seo.js              sitemap.xml and robots.txt
  pages.js                   List of all pages with titles and descriptions
  pricing.js                 Price estimator maths
  designs.js                 Loads and checks the 3D designs
  db.js                      Saves requests to data/quotes.json
  mailer.js                  Sends emails by SMTP
  security.js                CSRF tokens, honeypot, rate limiting, upload checks
  content/
    site.json                Your business details
    pricing.json             All prices
    designs.json             The 45 3D box designs
    catalog.json             Products, industries, FAQs, US/UK wording
    blog.json                Blog post list
views/
  base.html                  Header, footer, SEO tags, cookie banner (every page)
  partials/macros.html       Reusable pieces: 3D viewer, photo placeholder, FAQ block, price table, form fields
  home.html, product.html, niche.html, studio.html, pricing.html, quote.html, ...
  blog/                      Blog index, post layout and posts
  legal/                     Privacy, terms, cookies, shipping & returns
  admin/                     Admin pages
public/
  css/site.css               All styles; brand colours at the top
  js/site.js                 Mobile menu, cookie consent, analytics events
  js/motion.js               GSAP animations (scroll reveals, counters, hero)
  js/estimator.js            Live price estimator
  js/quote.js                Three-step quote form
  js/studio.js               3D Box Studio controls and gallery
  js/box3d/                  3D engine: textures.js, models.js, viewer.js, auto.js
  vendor/three/              Three.js r169 (MIT licence)
  vendor/gsap/               GSAP 3.12.5 and ScrollTrigger
  img/                       Logo, favicon, share image
test/site.test.js            Automated tests (npm test)
```

**Security notes.** Forms use CSRF tokens, a hidden honeypot field and rate limiting. Uploads are limited to 25 MB and to PDF, AI, EPS, SVG, PNG and JPG files, with a check that the file really is that type. They're stored under random names in `data/uploads/`, outside the public folder, and can only be downloaded from admin. CSV exports escape values that start with `=`, `+`, `-` or `@` so spreadsheets don't run them as formulas.
