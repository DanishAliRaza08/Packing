// 3D Box Studio: pick a design, customise it live, then download it or request a quote for it.
import { DESIGNS, DESIGNS_BY_ID, HAS_WEBGL, fontsReady } from "./box3d/auto.js";
import { BoxViewer, reducedMotion } from "./box3d/viewer.js";
import { QUOTE_STYLE, STYLE_NAMES } from "./box3d/models.js";

const root = document.querySelector("[data-studio]");
const CM = 2.54;

if (root && HAS_WEBGL) start();

function $(sel) { return root.querySelector(sel); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

async function start() {
  await fontsReady;
  const metric = root.dataset.unit === "cm";
  const stage = $(".studio-stage");
  const viewer = new BoxViewer(stage, { zoom: true });
  root.classList.add("ready");

  const form = $("#studio-form");
  const field = (name) => form.querySelector(`[name="${name}"]`);
  let base = null;
  let current = null;
  let logoImage = null;
  let timer = null;

  function toUnit(inches) { return metric ? Math.round(inches * CM * 2) / 2 : inches; }
  function toInches(value) { return metric ? value / CM : value; }

  function fillForm(d) {
    field("board").value = d.board;
    field("pattern").value = d.pattern.type;
    // Plain designs have no pattern colour; start from the logo colour so a new pattern shows up.
    field("pattern_color").value = d.pattern.type === "solid" ? d.logo.color : d.pattern.color;
    field("brand").value = d.logo.text;
    field("font").value = d.logo.font;
    field("logo_color").value = d.logo.color;
    field("foil").value = d.logo.foil || "";
    field("inside").value = d.inside;
    field("inside_print").checked = !!d.insidePrint;
    field("finish").value = d.finish;
    ["length", "width", "height"].forEach((k, i) => { field(k).value = toUnit(d.dims[i]); });
  }

  function readForm() {
    const d = clone(base);
    d.board = field("board").value;
    d.pattern.type = field("pattern").value;
    d.pattern.color = field("pattern_color").value;
    if (!base.pattern.color2 || d.pattern.color !== base.pattern.color) d.pattern.color2 = d.pattern.color;
    d.logo.text = field("brand").value.slice(0, 40);
    d.logo.font = field("font").value;
    d.logo.color = field("logo_color").value;
    d.logo.foil = field("foil").value || null;
    d.inside = field("inside").value;
    d.insidePrint = field("inside_print").checked;
    d.finish = field("finish").value;
    d.dims = ["length", "width", "height"].map((k, i) => {
      const v = parseFloat(field(k).value);
      const inches = Number.isFinite(v) && v > 0 ? toInches(v) : base.dims[i];
      return Math.min(Math.max(inches, 1), 30);
    });
    return d;
  }

  function describe(d) {
    const size = d.dims.map((v) => toUnit(v)).join(" × ") + (metric ? " cm" : " in");
    const parts = [
      `${d.name} (${d.id})`, `${STYLE_NAMES[d.style]}`, size, `board ${d.board}`,
      `pattern ${d.pattern.type} ${d.pattern.color}`, `logo "${d.logo.text}" ${d.logo.font} ${d.logo.foil ? d.logo.foil + " foil" : d.logo.color}`,
      `inside ${d.inside}${d.insidePrint ? " printed" : ""}`, `${d.finish} finish`,
    ];
    if (logoImage) parts.push("own logo uploaded in 3D studio (please send the file)");
    return parts.join("; ");
  }

  function updateLinks(d) {
    const quote = new URL(root.dataset.quoteUrl, window.location.href);
    const [l, w, h] = d.dims.map((v) => toUnit(v));
    quote.search = new URLSearchParams({
      style: QUOTE_STYLE[d.style], length: l, width: w, height: h, quantity: 500, design: describe(d).slice(0, 300),
    }).toString();
    $("#studio-quote").href = quote.pathname + quote.search;
  }

  function render() {
    const previous = current;
    current = readForm();
    const resized = !previous || previous.dims.some((v, i) => v !== current.dims[i]);
    viewer.load(current, { keepCamera: !resized, logoImage });
    updateLinks(current);
  }

  function select(id, { scroll = false } = {}) {
    const d = DESIGNS_BY_ID[id] || DESIGNS[0];
    base = clone(d);
    logoImage = null;
    field("logo_file").value = "";
    fillForm(base);
    current = readForm();
    viewer.load(current, { spin: true });
    viewer.setOpen(0, false);
    updateOpenButton(false);
    updateLinks(current);
    $("#studio-name").textContent = d.name;
    $("#studio-style").textContent = STYLE_NAMES[d.style];
    $("#studio-desc").textContent = d.description;
    root.querySelectorAll("[data-design-card]").forEach((card) => {
      card.classList.toggle("active", card.dataset.designCard === d.id);
    });
    const url = new URL(window.location.href);
    url.searchParams.set("design", d.id);
    history.replaceState(null, "", url);
    if (window.gsap && !reducedMotion) {
      window.gsap.fromTo(".studio-info > *", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" });
    }
    if (scroll) root.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function updateOpenButton(open) {
    const btn = $("#studio-open");
    btn.setAttribute("aria-pressed", open ? "true" : "false");
    btn.textContent = open ? "Close box" : "Open box";
  }

  form.addEventListener("input", (e) => {
    if (e.target.name === "logo_file") return;
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  });
  form.addEventListener("submit", (e) => e.preventDefault());

  field("logo_file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const error = $("#logo-error");
    error.hidden = true;
    if (!file) { logoImage = null; render(); return; }
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      error.textContent = "Please choose a PNG, JPG, SVG or WebP image under 5 MB.";
      error.hidden = false;
      e.target.value = "";
      return;
    }
    // The logo stays in the visitor's browser. It is only used to draw the preview.
    const img = new Image();
    img.onload = () => { logoImage = img; render(); };
    img.onerror = () => { error.textContent = "That image couldn't be read."; error.hidden = false; };
    img.src = URL.createObjectURL(file);
  });

  root.querySelectorAll("[data-swatch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      field(btn.dataset.target).value = btn.dataset.swatch;
      render();
    });
  });

  $("#studio-open").addEventListener("click", () => updateOpenButton(viewer.toggleOpen()));
  const rotateBtn = $("#studio-rotate");
  rotateBtn.addEventListener("click", () => {
    const on = rotateBtn.getAttribute("aria-pressed") !== "true";
    rotateBtn.setAttribute("aria-pressed", on ? "true" : "false");
    viewer.setAutoRotate(on);
  });
  if (reducedMotion) rotateBtn.setAttribute("aria-pressed", "false");
  $("#studio-reset-view").addEventListener("click", () => viewer.resetView());
  $("#studio-reset").addEventListener("click", () => select(base.id));
  $("#studio-download").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = viewer.snapshot();
    a.download = `${current.id}-mockup.png`;
    a.click();
  });
  $("#studio-share").addEventListener("click", async () => {
    const status = $("#studio-status");
    try {
      await navigator.clipboard.writeText(window.location.href);
      status.textContent = "Link copied.";
    } catch (e) {
      status.textContent = window.location.href;
    }
  });
  $("#studio-quote").addEventListener("click", () => window.track && window.track("studio_quote_clicked", { design: current.id }));

  // Gallery: click a card to load it, filter by style or industry.
  root.querySelectorAll("[data-design-card]").forEach((card) => {
    card.querySelector("button").addEventListener("click", () => {
      select(card.dataset.designCard, { scroll: true });
      if (window.track) window.track("design_selected", { design: card.dataset.designCard });
    });
  });

  const filters = { style: "", niche: "" };
  root.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const kind = chip.dataset.filter;
      filters[kind] = chip.dataset.value;
      root.querySelectorAll(`[data-filter="${kind}"]`).forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
      const shown = [];
      root.querySelectorAll("[data-design-card]").forEach((card) => {
        const match = (!filters.style || card.dataset.style === filters.style)
          && (!filters.niche || card.dataset.niches.split(" ").includes(filters.niche));
        card.hidden = !match;
        if (match) shown.push(card);
      });
      $("#gallery-count").textContent = `${shown.length} design${shown.length === 1 ? "" : "s"}`;
      if (window.gsap && !reducedMotion && shown.length) {
        window.gsap.fromTo(shown, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.03, ease: "power2.out" });
      }
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("style")) root.querySelector(`[data-filter="style"][data-value="${CSS.escape(params.get("style"))}"]`)?.click();
  if (params.get("niche")) root.querySelector(`[data-filter="niche"][data-value="${CSS.escape(params.get("niche"))}"]`)?.click();
  select(params.get("design") || root.dataset.initial);
}
