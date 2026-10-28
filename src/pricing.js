// Instant price estimator. All numbers come from content/pricing.json.
const CM_PER_INCH = 2.54;

class EstimateError extends Error {}

// Rounds on the exact decimal value (like Python's round), so 0.80499… stays 0.80.
const round2 = (n) => Number(n.toFixed(2));

function surfaceArea([l, w, h]) {
  return 2 * (l * w + l * h + w * h);
}

function sizeFactor(dimsIn, cfg) {
  const ratio = surfaceArea(dimsIn) / surfaceArea(cfg.reference_size_in);
  const factor = ratio ** cfg.size_exponent;
  return Math.min(Math.max(factor, cfg.size_factor_min), cfg.size_factor_max);
}

function tierFor(qty, cfg) {
  const tiers = [...cfg.quantity_tiers].sort((a, b) => a.min - b.min);
  let chosen = null;
  for (const tier of tiers) if (qty >= tier.min) chosen = tier;
  if (!chosen) throw new EstimateError(`Minimum order is ${tiers[0].min} boxes.`);
  return chosen;
}

/**
 * Estimated price range per box and in total, in the market's currency.
 * dims are [length, width, height] in `unit` ("in" or "cm"); defaults to the market's unit.
 */
function estimate({ style, dims, qty, material, sides = "outside", market = "us", unit }, cfg) {
  const mkt = cfg.markets[market];
  if (!mkt) throw new EstimateError("Unknown market.");
  unit = unit || mkt.unit;
  const styleCfg = cfg.styles[style];
  if (!styleCfg) throw new EstimateError("Choose a box style.");
  material = material || styleCfg.materials[0];
  if (!styleCfg.materials.includes(material)) throw new EstimateError("That material isn't available for this box style.");
  if (!cfg.print_sides[sides]) throw new EstimateError("Choose print sides.");

  const quantity = Number(qty);
  const numbers = (dims || []).map((d) => Number(d));
  if (!Number.isInteger(quantity) || numbers.length !== 3 || numbers.some((d) => !Number.isFinite(d))) {
    throw new EstimateError("Enter numbers for size and quantity.");
  }
  if (numbers.some((d) => d <= 0)) throw new EstimateError("Enter length, width and height.");
  const dimsIn = unit === "cm" ? numbers.map((d) => d / CM_PER_INCH) : numbers;
  if (Math.max(...dimsIn) > cfg.max_dimension_in) throw new EstimateError("That's larger than our estimator covers. Request a quote instead.");
  if (quantity < styleCfg.min_qty) throw new EstimateError(`Minimum order for this style is ${styleCfg.min_qty} boxes.`);

  const tier = tierFor(quantity, cfg);
  const multiplier = styleCfg.factor * cfg.materials[material].factor * cfg.print_sides[sides].factor * sizeFactor(dimsIn, cfg) * mkt.rate;
  const low = round2(tier.low * multiplier);
  const high = round2(tier.high * multiplier);
  return {
    currency: mkt.code, symbol: mkt.symbol, qty: quantity,
    per_box_low: low, per_box_high: high,
    total_low: round2(low * quantity), total_high: round2(high * quantity),
  };
}

// "From" prices at each table quantity: reference size, default material, printed outside.
function fromPriceTable(style, market, cfg) {
  const styleCfg = cfg.styles[style];
  return cfg.table_quantities
    .filter((qty) => qty >= styleCfg.min_qty)
    .map((qty) => estimate({ style, dims: cfg.reference_size_in, qty, market, unit: "in" }, cfg));
}

function lowestPrice(style, market, cfg) {
  const rows = fromPriceTable(style, market, cfg);
  return [Math.min(...rows.map((r) => r.per_box_low)), Math.max(...rows.map((r) => r.per_box_high))];
}

module.exports = { CM_PER_INCH, EstimateError, estimate, fromPriceTable, lowestPrice };
