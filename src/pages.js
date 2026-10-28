// Registry of every public page: used by the sitemap, the search page and page titles.

// endpoint: [title, meta description]. Values can be {"us": ..., "uk": ...}.
const STATIC_PAGES = {
  home: [
    { us: "Custom Candle Boxes & Printed Packaging", uk: "Custom Candle Boxes & Printed Packaging UK" },
    { us: "Custom printed candle boxes and mailer boxes from 100 units. Free 3D mockup in 24 hours, samples first, delivered with duties included.",
      uk: "Custom printed candle boxes and postal boxes from 100 units. Recyclable, free 3D mockup in 24 hours, delivered with duties included." },
  ],
  studio: [
    "3D Box Studio: 40+ Custom Box Designs",
    "Spin, open and customise 40+ custom box designs in 3D. Add your brand name or logo, change colours and sizes, then get a quote.",
  ],
  pricing: [
    { us: "Custom Box Prices: Instant Estimator", uk: "Custom Box Prices UK: Instant Estimator" },
    "Estimate the price of custom printed boxes in seconds. Pick a style, size, material and quantity for a price range per box and in total.",
  ],
  quote: [
    "Get a Free Quote and 3D Mockup",
    "Request a delivered price and a free 3D mockup of your custom box within 24 hours. Upload your artwork or ask for design help.",
  ],
  how_it_works: [
    "How Custom Packaging Works in 5 Steps",
    "From your idea to boxes at your door: free 3D mockup, physical sample, production in 10–20 business days and delivery with duties included.",
  ],
  samples: [
    "Custom Box Samples Before You Order",
    "Feel the board before you buy. Request free material samples, and approve a physical pre-production sample of every custom box order.",
  ],
  eco: [
    { us: "Eco-Friendly Mailer Boxes & Recyclable Packaging", uk: "Recyclable Postal Boxes & Plastic-Free Packaging" },
    { us: "Eco-friendly custom boxes: recyclable corrugated board, water-based inks and plastic-free options for small brands.",
      uk: "Recyclable, plastic-free custom postal boxes with material and weight data on every invoice for UK packaging EPR reporting." },
  ],
  about: [
    "About Us: Honest Custom Packaging",
    "Who we are, where your boxes are made and how we check quality. A named contact for every order and full honesty about sourcing.",
  ],
  contact: [
    "Contact Us",
    "Talk to a real person about your packaging. Email, WhatsApp or send a message and get a reply within a few hours on business days.",
  ],
  faq: [
    "Custom Packaging FAQ: 30+ Answers",
    "Answers about minimums, pricing, artwork, production times, samples, eco materials and UK orders for custom printed boxes.",
  ],
  blog: [
    "Packaging Guides and Advice",
    "Practical guides on custom box prices, sizes, materials and eco packaging for small brands.",
  ],
  privacy: ["Privacy Policy", "How we collect, use and protect your personal data."],
  terms: ["Terms of Sale", "The terms that apply when you order custom packaging from us."],
  cookies: ["Cookie Policy", "Which cookies we use and how to change your cookie choices."],
  shipping: ["Shipping and Returns", "How delivery works, lead times, and what happens if boxes arrive damaged or wrong."],
};

// Every indexable page for a market: {endpoint, args, title, description, markets}.
function allPages(market, content) {
  const pages = Object.entries(STATIC_PAGES).map(([endpoint, [title, description]]) => ({
    endpoint, args: {}, title, description, markets: ["us", "uk"],
  }));
  for (const p of content.catalog.PRODUCTS) {
    pages.push({ endpoint: "product", args: { slug: p.slug }, title: p.title, description: p.description, markets: ["us", "uk"] });
  }
  for (const n of content.catalog.NICHES) {
    pages.push({ endpoint: "niche", args: { slug: n.slug }, title: n.title, description: n.description, markets: ["us", "uk"] });
  }
  for (const post of content.blog.POSTS) {
    if (post.markets.includes(market)) {
      pages.push({ endpoint: "blog_post", args: { slug: post.slug }, title: post.title, description: post.description, markets: post.markets });
    }
  }
  return pages;
}

module.exports = { STATIC_PAGES, allPages };
