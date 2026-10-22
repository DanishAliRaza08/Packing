"""Page content for products, industries (niches) and FAQs.

Any text value can be a plain string (same on both sites) or a dict
{"us": "...", "uk": "..."} when the US and UK wording differs. Templates
pick the right one with the `m` filter. Sizes are always stored in inches;
the UK site converts them to centimetres automatically.
"""

# Words that change between the US and UK sites. Use in templates as {{ t.colour }}.
LOCALE = {
    "us": {
        "lang": "en-US",
        "hreflang": "en-us",
        "country": "United States",
        "colour": "color",
        "colours": "colors",
        "Colour": "Color",
        "mailer": "mailer boxes",
        "Mailer": "Mailer boxes",
        "postcode": "ZIP code",
        "personalised": "personalized",
        "customise": "customize",
        "organise": "organize",
        "favourite": "favorite",
        "cardboard": "corrugated cardboard",
        "delivered": "Delivered to your door, duties included",
    },
    "uk": {
        "lang": "en-GB",
        "hreflang": "en-gb",
        "country": "United Kingdom",
        "colour": "colour",
        "colours": "colours",
        "Colour": "Colour",
        "mailer": "postal boxes",
        "Mailer": "Postal boxes",
        "postcode": "postcode",
        "personalised": "personalised",
        "customise": "customise",
        "organise": "organise",
        "favourite": "favourite",
        "cardboard": "corrugated cardboard",
        "delivered": "Delivered to your door, duties included",
    },
}

STYLE_LABELS = {
    "mailer": {"us": "Mailer box", "uk": "Mailer / postal box"},
    "shipping": "Shipping box",
    "product": "Product box (folding carton)",
    "rigid": "Rigid gift box",
}

MATERIAL_LABELS = {
    "kraft-e": "Kraft E-flute (1.5 mm, light and neat)",
    "white-e": "White E-flute (1.5 mm, bright print)",
    "kraft-b": "Kraft B-flute (3 mm, stronger for shipping)",
    "white-b": "White B-flute (3 mm, stronger, bright print)",
    "sbs": "White card (SBS, 350 gsm)",
    "kraft-card": "Kraft card (350 gsm)",
    "rigid": "Rigid greyboard wrapped in printed paper",
}

PRINT_LABELS = {
    "outside": "Printed outside",
    "both": "Printed outside and inside",
    "plain": "Plain, no print",
}

FINISHES = [
    ("Matte lamination", "Soft, modern look that hides fingerprints."),
    ("Gloss lamination", "Shiny finish that makes full-colour photos pop."),
    ("Foil stamping", "Gold, silver or rose-gold metallic logo or text."),
    ("Spot UV", "A raised glossy layer on just your logo or pattern."),
    ("Embossing / debossing", "Your logo pressed up or down into the board."),
]

TRUST_POINTS = [
    {"us": "Low minimums from {min} boxes", "uk": "Low minimums from {min} boxes"},
    "Free 3D mockup in {hours} hours",
    "Physical sample before production",
    "Delivered to your door, duties included",
]

HOW_IT_WORKS = [
    ("Share your idea", "Tell us the product, size and quantity, and send your logo. Not sure on size? Send the product dimensions and we work it out."),
    ("Free 3D mockup", "Within {hours} hours you get a 3D mockup of your box with your artwork, plus a delivered price."),
    ("Approve a sample", "We make a physical sample. You check the size, colour and feel before a single production box is made."),
    ("Production", "Your boxes are printed in {days} business days. We send photos of your actual boxes before they ship."),
    ("Delivered", "Boxes arrive at your door with freight and duties already paid. Reorders take one message."),
]

PRODUCTS = [
    {
        "slug": "custom-mailer-boxes",
        "style": "mailer",
        "name": {"us": "Custom mailer boxes", "uk": "Custom postal boxes"},
        "title": {"us": "Custom Mailer Boxes from 100 Units", "uk": "Custom Postal Boxes UK from 100 Units"},
        "description": {
            "us": "Custom printed mailer boxes from 100 units. Kraft or white, printed inside and out. Free 3D mockup in 24 hours, delivered with duties included.",
            "uk": "Custom printed postal boxes from 100 units. Recyclable kraft or white board, printed inside and out. Free 3D mockup in 24 hours.",
        },
        "lead": {
            "us": "Self-locking mailer boxes that ship safely and open like a gift. The go-to box for e-commerce and subscription brands.",
            "uk": "Self-locking postal boxes that fit through the post safely and open like a gift. The go-to box for online shops and subscription brands.",
        },
        "what": {
            "us": "A mailer box is a one-piece corrugated box with a tuck-in lid and side flaps that lock without tape. It is strong enough to ship on its own, so your customer opens your printed box, not a brown carton. Print the outside with your logo and the inside with a thank-you message, and the unboxing does your marketing for you.",
            "uk": "A postal box (also called a mailer box) is a one-piece corrugated box with a tuck-in lid and side flaps that lock without tape. It is strong enough to post on its own, so your customer opens your printed box, not a plain cardboard carton. Print the outside with your logo and the inside with a thank-you message, and the unboxing does your marketing for you.",
        },
        "who": [
            "Online shops on Shopify, Etsy and Amazon",
            "Subscription boxes and monthly kits",
            "Candles, skincare, coffee and small gifts",
            "Influencer and PR packages",
        ],
        "sizes": [
            ("Small", [6, 4, 2]),
            ("Medium", [9, 6, 3]),
            ("Large", [12, 9, 4]),
            ("Extra large", [14, 10, 5]),
        ],
        "lead_time": "{days} business days after sample approval, plus 5–10 days shipping.",
        "faqs": [
            ("What is the minimum order for custom mailer boxes?", "Our minimum is {min} boxes. Prices per box drop at 250, 500, 1,000 and 2,500 units."),
            ("Can you print inside the box?", "Yes. Inside printing is popular for thank-you messages, social handles and patterns. It adds roughly a third to the box price."),
            ("Are your mailer boxes strong enough to ship on their own?", "Yes. E-flute suits items up to about 2 kg (4–5 lb). For heavier or fragile items we recommend B-flute."),
            ("Do you charge for custom sizes?", "Custom sizing is free from {custom_from} units. Below that we use our standard sizes or quote a small die fee."),
            ("Are the boxes recyclable?", "Yes. Corrugated board printed with water-based inks and no plastic lamination goes straight into kerbside recycling."),
        ],
        "niches": ["candles", "skincare", "subscription-boxes"],
    },
    {
        "slug": "custom-shipping-boxes",
        "style": "shipping",
        "name": "Custom shipping boxes",
        "title": {"us": "Custom Shipping Boxes for Small Business", "uk": "Custom Printed Shipping Boxes UK"},
        "description": {
            "us": "Custom printed shipping boxes for small businesses. Strong B-flute corrugated board, your logo outside, from 100 units. Free mockup in 24 hours.",
            "uk": "Custom printed shipping boxes and cardboard cartons from 100 units. Strong, recyclable B-flute board. Free mockup in 24 hours.",
        },
        "lead": "Classic flap-top shipping cartons, printed with your brand. Tough enough for heavy orders and bulk shipments.",
        "what": "A shipping box is the familiar flap-top carton (also called a regular slotted carton) that you seal with tape. It uses less board than a mailer box, so it is the cheapest way to put your logo on heavier or bigger orders. Brands use them for wholesale orders, multi-item orders and anything that needs extra protection.",
        "who": [
            "Heavier products: drinks, ceramics, home goods",
            "Wholesale and multi-item orders",
            "Brands moving from plain brown boxes",
            "Warehouse and 3PL shipping",
        ],
        "sizes": [
            ("Small", [8, 6, 4]),
            ("Medium", [12, 10, 6]),
            ("Large", [16, 12, 10]),
            ("Extra large", [20, 16, 12]),
        ],
        "lead_time": "{days} business days after sample approval, plus 5–10 days shipping.",
        "faqs": [
            ("What is the difference between a shipping box and a mailer box?", "A shipping box is a flap-top carton sealed with tape. A mailer box has a locking lid and opens like a gift. Shipping boxes cost less; mailer boxes look better on opening."),
            ("Which board should I choose?", "B-flute (3 mm) suits most shipping. For very heavy items, ask us about double-wall board."),
            ("Can you print just a one-colour logo?", "Yes. One-colour print is the most affordable option and looks great on kraft board."),
            ("Do you offer custom sizes?", "Yes, custom sizing is free from {custom_from} units."),
            ("Can you ship to my warehouse or 3PL?", "Yes. We deliver to any business address and can split a run across two addresses."),
        ],
        "niches": ["coffee", "apparel", "subscription-boxes"],
    },
    {
        "slug": "custom-product-boxes",
        "style": "product",
        "name": "Custom product boxes",
        "title": {"us": "Custom Product Boxes & Folding Cartons", "uk": "Custom Product Boxes & Cartons UK"},
        "description": {
            "us": "Custom printed product boxes (folding cartons) for retail shelves. Full color, foil and spot UV options, from 250 units. Free 3D mockup.",
            "uk": "Custom printed product boxes and folding cartons for retail. Full colour, foil and spot UV, from 250 units. Free 3D mockup in 24 hours.",
        },
        "lead": "Thin card retail boxes that sit on a shelf and sell. Perfect for jars, bottles, tubes and small items.",
        "what": "A product box (folding carton) is made from a single sheet of strong card, printed in full colour and folded into shape. It is the box you see on shop shelves for skincare, candles, tea and supplements. It shows off your design with sharp print and premium finishes, but it is not meant to be shipped on its own, so you put it inside a mailer or shipping box for delivery.",
        "who": [
            "Skincare, cosmetics and supplements",
            "Candles and home fragrance",
            "Tea, coffee and food gifts",
            "Products sold in shops and markets",
        ],
        "sizes": [
            ("Small jar", [3, 3, 3]),
            ("Bottle / dropper", [2, 2, 5]),
            ("Candle tin / jar", [4, 4, 4]),
            ("Tube / tall", [2, 2, 7]),
        ],
        "lead_time": "{days} business days after sample approval, plus 5–10 days shipping.",
        "faqs": [
            ("What is the minimum order for product boxes?", "Product boxes start at 250 units because each design needs its own cutting die."),
            ("Can I add a window?", "We can, but we recommend no plastic windows if you want the box to be fully recyclable. A die-cut opening without film works well."),
            ("What tuck styles do you offer?", "Reverse tuck end, straight tuck end, auto-lock bottom and sleeve styles. We recommend one in your mockup."),
            ("Can you add inserts to hold my product?", "Yes. Card inserts keep jars and bottles from moving. See our add-ons."),
            ("What finishes are available?", "Matte or gloss lamination, foil stamping, spot UV and embossing."),
        ],
        "niches": ["skincare", "candles", "coffee"],
    },
    {
        "slug": "rigid-gift-boxes",
        "style": "rigid",
        "name": "Rigid gift boxes",
        "title": {"us": "Custom Rigid Gift Boxes for Premium Brands", "uk": "Custom Rigid Gift Boxes UK"},
        "description": {
            "us": "Custom rigid gift boxes with lids, magnetic closures or drawers. Premium feel for gift sets and launches, from 250 units. Free 3D mockup.",
            "uk": "Custom rigid gift boxes with lids, magnetic closures or drawers. Premium gift sets and hampers, from 250 units. Free 3D mockup.",
        },
        "lead": "Thick, luxury boxes that customers keep. Lift-off lids, magnetic closures and drawer styles.",
        "what": "A rigid box is made from thick greyboard wrapped in printed or coloured paper. It does not fold flat, feels heavy in the hand and is the box people keep long after the product is gone. Use it for gift sets, launches, PR kits and premium ranges where the box is part of what customers pay for.",
        "who": [
            "Gift sets and hampers",
            "Luxury candles and fragrance",
            "PR and influencer kits",
            "Jewellery, accessories and keepsakes",
        ],
        "sizes": [
            ("Small", [4, 4, 2]),
            ("Medium", [8, 6, 3]),
            ("Large", [12, 9, 4]),
            ("Gift set", [14, 10, 4]),
        ],
        "lead_time": "15–25 business days after sample approval, plus 5–10 days shipping.",
        "faqs": [
            ("Why are rigid boxes more expensive?", "They use much thicker board and are wrapped and assembled by hand, so each box takes more material and labour."),
            ("What closures can I choose?", "Lift-off lid, magnetic flap, drawer (slide-out) and book style."),
            ("Can I add a foam or card insert?", "Yes. We recommend card or moulded pulp inserts over foam if you want the box to be recyclable."),
            ("Do rigid boxes ship flat?", "Standard rigid boxes ship assembled, which costs more in freight. Collapsible rigid boxes ship flat; ask us for a quote."),
            ("What is the minimum order?", "250 boxes."),
        ],
        "niches": ["candles", "skincare", "subscription-boxes"],
    },
    {
        "slug": "packaging-add-ons",
        "style": None,
        "name": "Packaging add-ons",
        "title": {"us": "Custom Tissue Paper, Tape, Stickers & Inserts", "uk": "Custom Tissue Paper, Tape, Stickers & Inserts UK"},
        "description": "Finish your unboxing with custom printed tissue paper, branded tape, stickers, thank-you cards and box inserts. Order with your boxes.",
        "lead": "Small touches that make the unboxing feel finished, ordered with your boxes so they arrive together.",
        "what": "Add-ons are the little extras inside and around the box: tissue paper that wraps the product, tape that seals the box, a sticker that closes the tissue, a card that says thank you, and an insert that holds everything in place. They cost little, add to the experience, and ship with your boxes in the same delivery.",
        "who": [
            "Brands that already have boxes and want more polish",
            "Gift and subscription brands",
            "Anyone shipping fragile items that need inserts",
        ],
        "addons": [
            ("Custom tissue paper", "Thin acid-free paper printed with your logo or pattern, one or two colours.", "from 500 sheets"),
            ("Printed packing tape", "Paper tape (recyclable) or plastic tape with your logo repeated.", "from 36 rolls"),
            ("Stickers and labels", "Round, square or custom-shaped stickers for sealing tissue and labelling boxes.", "from 250"),
            ("Thank-you and care cards", "Printed cards for thank-you notes, discount codes and care instructions.", "from 250"),
            ("Box inserts", "Card or corrugated inserts cut to hold jars, bottles and sets in place.", "from 250"),
            ("Crinkle paper fill", "Shredded paper fill in your brand colour.", "from 10 kg"),
        ],
        "lead_time": "Made alongside your boxes and shipped in the same delivery.",
        "faqs": [
            ("Can I order add-ons without boxes?", "Yes, though most clients add them to a box order to save on freight."),
            ("Is your tape recyclable?", "Our paper tape is recyclable with the box. Plastic tape needs removing before recycling."),
            ("Can tissue paper match my brand colour?", "We match Pantone colours on tissue paper. Send us your colour code."),
            ("Do you make custom inserts?", "Yes. Send us your product sizes and we design an insert as part of your mockup."),
            ("What is the minimum for stickers?", "250 stickers per design."),
        ],
        "niches": ["candles", "skincare", "apparel"],
    },
]

NICHES = [
    {
        "slug": "candles",
        "name": "candle brands",
        "short": "Candles",
        "keyword": {"us": "Custom candle boxes", "uk": "Custom candle boxes UK"},
        "title": {"us": "Custom Candle Boxes from 100 Units", "uk": "Custom Candle Boxes UK | Printed Candle Packaging"},
        "description": {
            "us": "Custom candle boxes and candle mailer boxes from 100 units. Sized for your jar or tin, with inserts. Free 3D mockup in 24 hours.",
            "uk": "Custom printed candle boxes from 100 units. Recyclable, sized for your jar or tin, with inserts. Free 3D mockup in 24 hours.",
        },
        "hero": "Custom candle boxes that sell your brand before it's opened",
        "intro": "Candles are heavy, made of glass and bought as gifts, so the box has to protect the jar and look good on the shelf and doorstep. We design boxes around your exact vessel, add an insert so nothing rattles, and print them so customers know it's yours before they open it.",
        "problems": [
            ("Glass jars break in the post", "We size the box to your jar and add a card insert, so the candle can't move."),
            ("Generic boxes don't fit", "Custom sizing is free from {custom_from} units, so you stop paying for wasted space and void fill."),
            ("Tiny first orders", "Start from {min} boxes while you test a new scent or launch a collection."),
            ("Gift buyers judge the box", "Foil, spot UV and inside print make the box feel like part of the gift."),
        ],
        "styles": [
            ("custom-mailer-boxes", "Ship single candles and gift sets direct to customers."),
            ("custom-product-boxes", "Retail boxes for jars and tins on shop shelves."),
            ("rigid-gift-boxes", "Premium boxes for gift sets and launches."),
            ("packaging-add-ons", "Inserts, tissue paper and care cards."),
        ],
        "examples": [
            ("8 oz jar candle (3 in × 3.5 in)", [3.5, 3.5, 4]),
            ("Travel tin (2.5 in)", [3, 3, 2]),
            ("Three-wick candle", [5, 5, 4.5]),
            ("Gift set of 3 jars", [11, 4, 4.5]),
        ],
        "faqs": [
            ("What size box do I need for my candle?", "Measure your jar's widest point and height, then add about 3 mm (1/8 in) to each side. Send us the sizes and we'll confirm in your mockup."),
            ("Do I need an insert?", "For glass jars sent by post, yes. A simple card insert stops the jar moving and costs very little."),
            ("Can I print burn and safety instructions?", "Yes. We can print warnings and care instructions on the base or inside flap."),
            ("Will the box smell of ink?", "No. We use low-odour water-based inks that won't affect your fragrance."),
            ("Can I have different labels for each scent with one box design?", "Yes. Many brands use one box and add a scent sticker, which keeps minimums low."),
        ],
    },
    {
        "slug": "skincare",
        "name": "skincare and beauty brands",
        "short": "Skincare",
        "keyword": "Custom skincare boxes",
        "title": {"us": "Custom Skincare & Cosmetic Boxes", "uk": "Custom Skincare & Cosmetic Boxes UK"},
        "description": "Custom printed skincare and cosmetic boxes for bottles, droppers and jars. Premium finishes, inserts and low minimums. Free mockup in 24 hours.",
        "hero": "Skincare boxes as clean and considered as your formulas",
        "intro": "Skincare buyers expect packaging that looks clean, premium and responsible. We make product cartons for bottles, droppers and jars, plus mailer boxes for online orders and gift sets, with room for ingredients and legal text.",
        "problems": [
            ("Lots of SKUs, small runs", "Low minimums per design, or one shared box with product stickers."),
            ("Ingredient and legal text", "We lay out INCI lists, batch codes and warnings clearly."),
            ("Premium look on a budget", "Matte lamination and a single foil logo look premium for little extra cost."),
            ("Eco-conscious customers", "Plastic-free, recyclable card and water-based inks."),
        ],
        "styles": [
            ("custom-product-boxes", "Retail cartons for bottles, droppers and jars."),
            ("custom-mailer-boxes", "Online orders and routine sets."),
            ("rigid-gift-boxes", "Gift sets and launch PR kits."),
            ("packaging-add-ons", "Inserts and tissue paper."),
        ],
        "examples": [
            ("30 ml dropper bottle", [1.6, 1.6, 4.7]),
            ("50 ml cream jar", [2.6, 2.6, 2.2]),
            ("Routine set (3 items)", [8, 6, 2.5]),
        ],
        "faqs": [
            ("Can you print ingredient lists?", "Yes. Send the text and we lay it out at a readable size."),
            ("What finish looks most premium?", "Soft-touch matte with a foil logo is the most requested premium finish."),
            ("Can one box fit several products?", "Yes, with a shared box size and scent or product stickers."),
            ("Can you add a dropper insert?", "Yes. Card inserts hold droppers and jars upright."),
            ("Are your boxes plastic-free?", "They can be: card or corrugated board, water-based inks and no plastic window or lamination."),
        ],
    },
    {
        "slug": "coffee",
        "name": "coffee roasters and tea brands",
        "short": "Coffee & tea",
        "keyword": "Custom coffee boxes",
        "title": {"us": "Custom Coffee Boxes & Subscription Mailers", "uk": "Custom Coffee Boxes UK | Letterbox Coffee Packaging"},
        "description": {
            "us": "Custom coffee and tea boxes for bags, pods and subscription mailers. Sized for your bags, from 100 units. Free 3D mockup in 24 hours.",
            "uk": "Custom letterbox coffee boxes and tea packaging, sized to fit through the letterbox. From 100 units. Free 3D mockup in 24 hours.",
        },
        "hero": "Coffee boxes that arrive as fresh as your roast",
        "intro": "Coffee and tea brands ship often, so the box needs to be cheap enough to use every time and good enough to remember. We make subscription mailers sized for your bags, gift boxes for bundles and shipping cartons for wholesale.",
        "problems": [
            ("Subscriptions need a fixed box", "A box sized for one or two bags keeps postage low every month."),
            ("Letterbox delivery", {"us": "Slim mailers keep postage costs down.", "uk": "Letterbox-friendly sizes (under 2.5 cm deep) avoid missed deliveries."}),
            ("Wholesale orders", "Printed shipping cartons for café and shop orders."),
            ("Seasonal gift sets", "Rigid or mailer gift boxes for holiday bundles."),
        ],
        "styles": [
            ("custom-mailer-boxes", "Subscription and single-bag orders."),
            ("custom-shipping-boxes", "Wholesale and café orders."),
            ("rigid-gift-boxes", "Gift bundles and tasting sets."),
            ("packaging-add-ons", "Brew guides, stickers and tape."),
        ],
        "examples": [
            ("One 250 g / 12 oz bag", [7, 4, 2.5]),
            ("Two bags", [9, 7, 3]),
            ("Letterbox box", [9.3, 6.3, 0.9]),
        ],
        "faqs": [
            ("Can you print a brew guide inside the lid?", "Yes, inside print is ideal for brew guides and roast notes."),
            ("Will a box fit through a letterbox?", "Our letterbox size is made to fit UK Royal Mail large letter limits. Check your carrier's current limits before ordering."),
            ("Can you make boxes for pods or tea bags?", "Yes, as product boxes with inserts."),
            ("Do you print coffee bags too?", "Not yet. We focus on boxes and add-ons."),
            ("Can I order the same box every month?", "Yes. We keep your artwork and dieline on file so reorders take one message."),
        ],
    },
    {
        "slug": "apparel",
        "name": "clothing and apparel brands",
        "short": "Apparel",
        "keyword": "Custom apparel boxes",
        "title": {"us": "Custom Apparel Boxes & Clothing Mailers", "uk": "Custom Clothing Boxes UK | Apparel Postal Boxes"},
        "description": "Custom printed apparel boxes and clothing mailers for t-shirts, hoodies and shoes. Branded unboxing from 100 units. Free 3D mockup.",
        "hero": "Clothing boxes that turn a delivery into a drop",
        "intro": "Clothing is light but buyers expect a branded unboxing, especially for drops and limited releases. Slim mailer boxes with tissue paper and a sticker cost little more than a poly mailer and get shared far more often.",
        "problems": [
            ("Poly mailers feel cheap", "A slim printed mailer feels premium and is plastic-free."),
            ("Postage on big boxes", "Slim boxes sized to folded garments keep postage down."),
            ("Drops and collabs", "Short runs for limited editions and collaborations."),
            ("Returns", "Strong mailers can be reused for returns."),
        ],
        "styles": [
            ("custom-mailer-boxes", "T-shirts, hoodies and accessories."),
            ("custom-shipping-boxes", "Bulk and multi-item orders."),
            ("packaging-add-ons", "Tissue paper, stickers and tape."),
        ],
        "examples": [
            ("Folded t-shirt", [10, 8, 2]),
            ("Hoodie", [12, 10, 4]),
            ("Sneakers", [14, 10, 5]),
        ],
        "faqs": [
            ("Are boxes much more expensive than poly mailers?", "A little, but they are plastic-free and much more likely to be shared online. Slim sizes keep the gap small."),
            ("Can you print tissue paper with our pattern?", "Yes, from 500 sheets."),
            ("Can I use the same box for different garments?", "Yes. Most apparel brands use two sizes."),
            ("Can you do a limited-edition box for one drop?", "Yes, from {min} boxes."),
            ("Can customers reuse the box for returns?", "Yes, if you add a second strip of tape or a tear strip."),
        ],
    },
    {
        "slug": "subscription-boxes",
        "name": "subscription box companies",
        "short": "Subscription boxes",
        "keyword": "Custom subscription boxes",
        "title": {"us": "Custom Subscription Boxes from 100 Units", "uk": "Custom Subscription Boxes UK"},
        "description": "Custom printed subscription boxes with inside print, inserts and one-click reorders. From 100 units. Free 3D mockup in 24 hours.",
        "hero": "Subscription boxes your members look forward to opening",
        "intro": "For a subscription, the box is the product experience every single month. We make mailers with inside print and inserts, keep your files on file and make reordering as simple as one message.",
        "problems": [
            ("You order every month", "Your artwork and dieline stay on file for one-click reorders."),
            ("Cash flow", "Order 2–3 months at a time from {min} boxes, not a year's worth."),
            ("Contents change", "One branded outer box with a changing printed card inside."),
            ("Unboxing videos", "Inside print and tissue paper look great on camera."),
        ],
        "styles": [
            ("custom-mailer-boxes", "The classic subscription box."),
            ("custom-shipping-boxes", "Larger or heavier boxes."),
            ("packaging-add-ons", "Monthly cards, tissue and inserts."),
        ],
        "examples": [
            ("Small box", [8, 6, 2]),
            ("Standard box", [10, 8, 4]),
            ("Large box", [12, 10, 5]),
        ],
        "faqs": [
            ("Can you store boxes and send them monthly?", "Not yet. We deliver each run to you or your fulfilment partner."),
            ("Can I change the inside print each month?", "Changing the box print each month needs a new run each time. Most brands keep the box and change a printed card."),
            ("How fast are reorders?", "Reorders skip the mockup and sample, so they go straight into production."),
            ("Can you ship to my fulfilment company?", "Yes, to any business address."),
            ("What's the best box for a subscription?", "A mailer box with inside print. It ships on its own and looks great opened."),
        ],
    },
]

# Main FAQ page, grouped by category. Placeholders in {curly braces} are filled from site.json.
FAQ_GROUPS = [
    ("Ordering and minimums", [
        ("What is your minimum order?", "Most boxes start at {min} units. Product boxes and rigid boxes start at 250 units."),
        ("How do I get a price?", "Use the instant price estimator for a ballpark figure, then request a quote for an exact delivered price."),
        ("How long is a quote valid?", "Quotes are valid for 15–30 days because board prices change."),
        ("Can I order different designs in one order?", "Yes. Each design has its own minimum, but they can ship together."),
        ("How do reorders work?", "We keep your artwork and dieline on file. Send us a message with the quantity and we start production."),
        ("Do you work with businesses only?", "Yes. We supply businesses and brands, not one-off personal orders."),
    ]),
    ("Pricing and payment", [
        ("Why does the price per box drop with quantity?", "Setting up the press costs the same for 100 or 10,000 boxes, so larger runs spread that cost."),
        ("Are shipping and duties included?", "Yes. Every quote is a delivered price to your door, including freight and import duties."),
        ("How do I pay?", "We send an invoice from our US company that you can pay by card or bank transfer. UK clients can pay in GBP."),
        ("Do you need a deposit?", "We take 50% on approval of your sample and 50% before shipping. Terms may vary for repeat clients."),
        ("Are there any setup or die fees?", "Custom sizes are free from {custom_from} units. Smaller custom-size runs may have a small die fee, shown in your quote."),
    ]),
    ("Design and artwork", [
        ("Do you offer design help?", "Yes. Tell us what you want and our designer prepares the artwork. Simple logo placement is free."),
        ("What file types do you accept?", "PDF, AI, EPS, SVG, PNG or JPG. Vector files (PDF, AI, EPS, SVG) give the sharpest print."),
        ("What is a dieline?", "A dieline is the flat template of your box showing cuts, folds and where artwork goes. We send one with your mockup."),
        ("What is the free 3D mockup?", "A 3D picture of your box with your artwork, sent within {hours} hours, so you can see it before paying anything."),
        ("Can you match my brand colours?", "Yes. Send Pantone or CMYK values. Colours may vary slightly between board types; your sample shows the real result."),
    ]),
    ("Production and shipping", [
        ("How long does production take?", "{days} business days after sample approval, plus 5–10 days shipping. Rigid boxes take a little longer."),
        ("Where are the boxes made?", "Boxes are made in vetted partner factories in Pakistan, with a US digital printer for small rush orders. Our US partner checks samples and quality."),
        ("Do I see the boxes before they ship?", "Yes. We send photos of your actual production boxes before shipping."),
        ("Can you rush an order?", "Small runs can often be printed in the US faster. Ask us for a rush quote."),
        ("What if boxes arrive damaged or wrong?", "Tell us within 7 days with photos. We reprint or refund faulty boxes. See our Shipping & Returns policy."),
    ]),
    ("Samples", [
        ("Can I get a sample before ordering?", "Yes. Every order includes a physical pre-production sample to approve."),
        ("Is the sample free?", "The pre-production sample is included in your order. Plain stock samples to feel the board are also available."),
        ("How long does a sample take?", "Usually 5–7 business days to make, plus shipping."),
    ]),
    ("Materials and eco", [
        ("Are your boxes recyclable?", "Our corrugated and card boxes are recyclable when printed with water-based inks and made without plastic windows or lamination."),
        ("What's the difference between kraft and white board?", "Kraft is natural brown and has a crafted look. White gives brighter, more accurate colours."),
        ("What is E-flute and B-flute?", "Flute is the wavy layer inside corrugated board. E-flute is thin (1.5 mm) and neat; B-flute is thicker (3 mm) and stronger."),
        ("Do you offer recycled board?", "Yes. Ask for recycled-content board in your quote."),
    ]),
    ("UK orders", [
        ("Do you deliver to the UK?", "Yes. UK quotes are in GBP and delivered to your door with duties included."),
        ("Who handles UK import VAT?", "UK business clients normally reclaim import VAT. We'll explain how it works for your order; check with your accountant."),
        ("Do you help with UK packaging EPR reporting?", "Yes. We provide the material type and weight per box on every invoice so you can report easily."),
    ]),
]

HOME_FAQ_COUNT = 7

BLOG_CATEGORIES = ["Pricing", "Guides", "Eco & compliance"]
