"""Blog post list. Each post's body lives in templates/blog/posts/<slug>.html.

To add a post: add an entry here and create the matching template file.
`markets` controls which site(s) show it: ["us", "uk"] for both.
"""

POSTS = [
    {
        "slug": "how-much-do-custom-mailer-boxes-cost",
        "title": {"us": "How Much Do Custom Mailer Boxes Cost?", "uk": "How Much Do Custom Postal Boxes Cost?"},
        "description": {
            "us": "Real price ranges for custom mailer boxes at 100, 250, 500, 1,000 and 2,500 units, and the five things that change the price.",
            "uk": "Real price ranges for custom postal boxes at 100 to 2,500 units in GBP, and the five things that change the price.",
        },
        "category": "Pricing",
        "published": "2026-10-22",
        "updated": "2026-10-22",
        "markets": ["us", "uk"],
        "product": "custom-mailer-boxes",
    },
    {
        "slug": "mailer-box-vs-shipping-box",
        "title": "Mailer Box vs Shipping Box: Which Does Your Brand Need?",
        "description": "The difference between mailer boxes and shipping boxes, what each costs and which one fits your products.",
        "category": "Guides",
        "published": "2026-10-22",
        "updated": "2026-10-22",
        "markets": ["us", "uk"],
        "product": "custom-shipping-boxes",
    },
    {
        "slug": "what-size-box-for-candles",
        "title": "What Size Box Do I Need for My Candles?",
        "description": "How to measure your candle jar or tin, how much space to leave, and standard candle box sizes that work.",
        "category": "Guides",
        "published": "2026-10-22",
        "updated": "2026-10-22",
        "markets": ["us", "uk"],
        "product": "custom-product-boxes",
    },
    {
        "slug": "uk-packaging-epr-explained",
        "title": "UK Packaging EPR Explained for Small Businesses",
        "description": "Who UK packaging EPR applies to, the thresholds, and how to choose boxes that make reporting easy.",
        "category": "Eco & compliance",
        "published": "2026-10-22",
        "updated": "2026-10-22",
        "markets": ["uk"],
        "product": "custom-mailer-boxes",
    },
]

AUTHOR = {
    "name": "Danish",
    "bio": "Founder. Designs boxes and manages production for small brands, and answers every quote personally.",
}
