// Paints box surfaces (board colour, printed pattern, logo) onto canvases.
// All pattern sizes are in inches, so prints look the same scale on every panel.

const PX_PER_IN = 48;
const MAX_PX = 1024;

export const PATTERNS = [
  "solid", "stripes", "diagonal", "dots", "grid", "waves", "chevron", "checker", "terrazzo",
  "botanical", "confetti", "rays", "halftone", "triangles", "marble", "topo", "stars", "scallop",
];

export const FONTS = {
  serif: "600 {size}px Fraunces, Georgia, serif",
  sans: "600 {size}px Inter, Helvetica, Arial, sans-serif",
  script: "italic 600 {size}px Fraunces, Georgia, serif",
};

const FOILS = {
  gold: ["#a8782a", "#f6dd94", "#b8862b", "#f1d27a", "#9c6d22"],
  silver: ["#8d9196", "#f4f5f7", "#a4a8ad", "#e9eaec", "#7d8186"],
  rose: ["#b07466", "#f6d3c7", "#c08676", "#efc2b4", "#a5695c"],
};

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

// Draws the pattern in inch units over a w × h (inches) area.
function drawPattern(ctx, w, h, pattern, rnd) {
  const s = pattern.scale || 1;
  const c1 = pattern.color;
  const c2 = pattern.color2 || pattern.color;
  ctx.save();
  switch (pattern.type) {
    case "stripes": {
      const band = 0.45 * s;
      for (let y = 0, i = 0; y < h + band; y += band * 2, i++) {
        ctx.fillStyle = i % 2 ? c2 : c1;
        ctx.fillRect(0, y, w, band);
      }
      break;
    }
    case "diagonal": {
      ctx.fillStyle = c1;
      const step = 1.5 * s;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      const span = w + h;
      for (let x = -span; x < span; x += step) ctx.fillRect(x, -span, step * 0.4, span * 2);
      break;
    }
    case "dots": {
      const step = 0.8 * s;
      ctx.fillStyle = c1;
      for (let y = 0, row = 0; y < h + step; y += step, row++) {
        for (let x = row % 2 ? step / 2 : 0; x < w + step; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 0.13 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "grid": {
      ctx.strokeStyle = c1;
      ctx.lineWidth = 0.025 * s;
      const step = 0.5 * s;
      ctx.beginPath();
      for (let x = 0; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      break;
    }
    case "waves": {
      ctx.strokeStyle = c1;
      ctx.lineWidth = 0.07 * s;
      ctx.lineCap = "round";
      const step = 0.6 * s;
      for (let y = 0; y < h + step; y += step) {
        ctx.beginPath();
        for (let x = 0; x <= w + 0.1; x += 0.1) ctx.lineTo(x, y + Math.sin((x / s) * 3) * 0.15 * s);
        ctx.stroke();
      }
      break;
    }
    case "chevron": {
      ctx.strokeStyle = c1;
      ctx.lineWidth = 0.12 * s;
      ctx.lineJoin = "miter";
      const step = 0.8 * s;
      for (let y = 0; y < h + step; y += step) {
        ctx.beginPath();
        for (let x = 0, i = 0; x <= w + step; x += step / 2, i++) ctx.lineTo(x, y + (i % 2 ? step / 3 : 0));
        ctx.stroke();
      }
      break;
    }
    case "checker": {
      const size = 0.75 * s;
      ctx.fillStyle = c1;
      for (let y = 0, r = 0; y < h; y += size, r++) {
        for (let x = 0, c = 0; x < w; x += size, c++) if ((r + c) % 2) ctx.fillRect(x, y, size, size);
      }
      break;
    }
    case "terrazzo": {
      const count = Math.round(w * h * 5);
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = rnd() > 0.5 ? c1 : c2;
        const x = rnd() * w, y = rnd() * h, r = (0.04 + rnd() * 0.14) * s;
        ctx.beginPath();
        const sides = 5 + Math.floor(rnd() * 3);
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const rr = r * (0.6 + rnd() * 0.5);
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.fill();
      }
      break;
    }
    case "botanical": {
      const step = 1.1 * s;
      for (let y = -step; y < h + step; y += step) {
        for (let x = -step; x < w + step; x += step) {
          const px = x + rnd() * step * 0.6, py = y + rnd() * step * 0.6;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rnd() * Math.PI * 2);
          ctx.fillStyle = rnd() > 0.5 ? c1 : c2;
          for (let l = 0; l < 3; l++) {
            ctx.save();
            ctx.rotate((l - 1) * 0.6);
            ctx.beginPath();
            ctx.ellipse(0, -0.28 * s, 0.11 * s, 0.28 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
      break;
    }
    case "confetti": {
      const count = Math.round(w * h * 2.2);
      const colours = [c1, c2, "#ffbe0b", "#8ac926"];
      for (let i = 0; i < count; i++) {
        ctx.save();
        ctx.translate(rnd() * w, rnd() * h);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = colours[Math.floor(rnd() * colours.length)];
        if (rnd() > 0.5) ctx.fillRect(-0.12 * s, -0.04 * s, 0.24 * s, 0.08 * s);
        else { ctx.beginPath(); ctx.arc(0, 0, 0.06 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      break;
    }
    case "rays": {
      ctx.fillStyle = c1;
      const cx = w / 2, cy = h / 2, r = Math.hypot(w, h);
      for (let i = 0; i < 36; i += 2) {
        const a1 = (i / 36) * Math.PI * 2, a2 = ((i + 1) / 36) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
        ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        ctx.fill();
      }
      break;
    }
    case "halftone": {
      const step = 0.32 * s;
      ctx.fillStyle = c1;
      for (let y = 0; y < h + step; y += step) {
        for (let x = 0; x < w + step; x += step) {
          const k = 0.5 + 0.5 * Math.sin((x + y) / (2.2 * s));
          ctx.beginPath();
          ctx.arc(x, y, step * 0.48 * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "triangles": {
      const size = 0.9 * s, th = size * 0.866;
      for (let y = 0, r = 0; y < h + th; y += th, r++) {
        for (let x = -size, c = 0; x < w + size; x += size / 2, c++) {
          const up = (c + r) % 2 === 0;
          ctx.fillStyle = (c + r * 3) % 3 === 0 ? c2 : c1;
          if ((c + r) % 4 === 1) continue;
          ctx.beginPath();
          if (up) { ctx.moveTo(x, y + th); ctx.lineTo(x + size / 2, y); ctx.lineTo(x + size, y + th); }
          else { ctx.moveTo(x, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size / 2, y + th); }
          ctx.fill();
        }
      }
      break;
    }
    case "marble": {
      ctx.strokeStyle = c1;
      ctx.lineCap = "round";
      const veins = Math.round((w + h) * 1.2);
      for (let i = 0; i < veins; i++) {
        ctx.globalAlpha = 0.25 + rnd() * 0.5;
        ctx.lineWidth = (0.01 + rnd() * 0.05) * s;
        let x = rnd() * w, y = rnd() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          const nx = x + (rnd() - 0.3) * 2 * s, ny = y + (rnd() - 0.5) * 1.2 * s;
          ctx.quadraticCurveTo(x + (rnd() - 0.5) * s, y + (rnd() - 0.5) * s, nx, ny);
          x = nx; y = ny;
        }
        ctx.stroke();
      }
      break;
    }
    case "topo": {
      ctx.strokeStyle = c1;
      ctx.lineWidth = 0.03 * s;
      const centres = Math.max(2, Math.round((w * h) / 30));
      for (let c = 0; c < centres; c++) {
        const cx = rnd() * w, cy = rnd() * h, wobble = rnd() * 10;
        for (let r = 0.25 * s; r < 4 * s; r += 0.28 * s) {
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
            const rr = r * (1 + 0.18 * Math.sin(a * 3 + wobble + r) + 0.08 * Math.sin(a * 5 + c));
            ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
          }
          ctx.stroke();
        }
      }
      break;
    }
    case "stars": {
      ctx.fillStyle = c1;
      const count = Math.round(w * h * 1.5);
      for (let i = 0; i < count; i++) star(ctx, rnd() * w, rnd() * h, (0.04 + rnd() * 0.09) * s);
      break;
    }
    case "scallop": {
      ctx.strokeStyle = c1;
      ctx.lineWidth = 0.05 * s;
      const step = 0.7 * s;
      for (let y = 0, r = 0; y < h + step; y += step / 2, r++) {
        for (let x = r % 2 ? step / 2 : 0; x < w + step; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step / 2, 0, Math.PI);
          ctx.stroke();
        }
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function fitText(ctx, text, fontKey, maxW, maxH) {
  let size = maxH;
  const tpl = FONTS[fontKey] || FONTS.sans;
  ctx.font = tpl.replace("{size}", size);
  const width = ctx.measureText(text).width;
  if (width > maxW) size = (size * maxW) / width;
  ctx.font = tpl.replace("{size}", size);
  return size;
}

function foilGradient(ctx, foil, x, y, w, h) {
  const stops = FOILS[foil] || FOILS.gold;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

// Draws the logo (text or uploaded image) centred in a w × h (px) canvas.
// When maskOnly is true, draws the logo in white for the foil shine mask.
function drawLogo(ctx, w, h, logo, image, maskOnly) {
  const maxW = w * 0.72;
  const maxH = h * 0.32;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (image) {
    const ratio = Math.min(maxW / image.width, (h * 0.5) / image.height);
    const iw = image.width * ratio, ih = image.height * ratio;
    if (maskOnly) { ctx.fillStyle = "#fff"; ctx.fillRect(-iw / 2, -ih / 2, iw, ih); }
    else ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih);
  } else if (logo.text) {
    const size = fitText(ctx, logo.text, logo.font, maxW, maxH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(logo.text).width;
    ctx.fillStyle = maskOnly ? "#fff" : logo.foil ? foilGradient(ctx, logo.foil, -tw / 2, -size / 2, tw, size) : logo.color;
    ctx.fillText(logo.text, 0, size * 0.04);
  }
  ctx.restore();
}

/**
 * Returns {canvas, foilMask} for one face of a panel.
 * face: {w, h} in inches, side: "outside" | "inside", logo: bool, message: text for inside lids.
 */
export function paintFace(design, face, options = {}) {
  const q = options.quality || 1;
  const scale = Math.min(PX_PER_IN * q, (MAX_PX * q) / Math.max(face.w, face.h));
  const cw = Math.max(8, Math.round(face.w * scale));
  const ch = Math.max(8, Math.round(face.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const rnd = random(hashString(`${design.id}:${face.key || ""}:${options.side}`));
  const inside = options.side === "inside";

  ctx.fillStyle = inside ? design.inside : design.board;
  ctx.fillRect(0, 0, cw, ch);
  if (!inside || design.insidePrint) {
    ctx.save();
    ctx.scale(scale, scale);
    if (inside) ctx.globalAlpha = 0.35;
    drawPattern(ctx, face.w, face.h, design.pattern, rnd);
    ctx.restore();
  }

  let foilMask = null;
  const image = options.logoImage || null;
  if (options.logo && !inside) {
    drawLogo(ctx, cw, ch, design.logo, image, false);
    if (design.logo.foil && !image) {
      foilMask = document.createElement("canvas");
      foilMask.width = cw;
      foilMask.height = ch;
      const m = foilMask.getContext("2d");
      m.fillStyle = "#000";
      m.fillRect(0, 0, cw, ch);
      drawLogo(m, cw, ch, design.logo, null, true);
    }
  }
  if (options.message && inside && design.insidePrint) {
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(Math.PI);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size = fitText(ctx, options.message, design.logo.font, cw * 0.7, ch * 0.16);
    ctx.fillStyle = design.logo.foil ? foilGradient(ctx, design.logo.foil, -cw / 3, -size, cw / 1.5, size) : design.logo.color;
    ctx.fillText(options.message, 0, 0);
    ctx.restore();
  }
  return { canvas, foilMask };
}
