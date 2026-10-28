// Builds 3D boxes from thin panels. Each style returns a group plus setOpen(0..1).
// Coordinates are in inches: x = length, y = height, z = width (depth). Origin is the bottom centre.
import * as THREE from "three";
import { paintFace } from "./textures.js";

export const STYLE_NAMES = {
  mailer: "Mailer box",
  shipping: "Shipping box",
  tuck: "Product box (tuck end)",
  rigid: "Rigid lid & base",
  drawer: "Drawer box",
  magnetic: "Magnetic gift box",
};

// Box styles map to the quote form's style options.
export const QUOTE_STYLE = {
  mailer: "mailer", shipping: "shipping", tuck: "product", rigid: "rigid", drawer: "rigid", magnetic: "rigid",
};

const THICKNESS = { mailer: 0.12, shipping: 0.16, tuck: 0.05, rigid: 0.16, drawer: 0.12, magnetic: 0.16 };
const CORRUGATED_EDGE = "#b48a5e";
const FINISH = { matte: 0.82, "soft": 0.95, gloss: 0.28 };

class Skinner {
  // Creates and caches materials, and tracks GPU resources so the box can be disposed.
  constructor(design, options) {
    this.design = design;
    this.options = options;
    this.resources = [];
    const corrugated = ["mailer", "shipping"].includes(design.style);
    this.edge = this.track(new THREE.MeshStandardMaterial({
      color: corrugated ? CORRUGATED_EDGE : design.board, roughness: 0.9,
    }));
  }

  track(resource) {
    this.resources.push(resource);
    return resource;
  }

  texture(canvas) {
    const tex = this.track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  face(w, h, side, extra = {}) {
    const { canvas, foilMask } = paintFace(this.design, { w, h, key: extra.key }, {
      side, logo: extra.logo, message: extra.message, logoImage: this.options.logoImage,
      quality: this.options.quality,
    });
    const roughness = FINISH[this.design.finish] ?? 0.85;
    const params = { map: this.texture(canvas), roughness, metalness: 0 };
    if (foilMask) {
      // White areas of the mask become shiny metal; the rest keeps the paper finish.
      const rough = document.createElement("canvas");
      rough.width = foilMask.width;
      rough.height = foilMask.height;
      const ctx = rough.getContext("2d");
      const level = Math.round(roughness * 255);
      ctx.fillStyle = `rgb(${level},${level},${level})`;
      ctx.fillRect(0, 0, rough.width, rough.height);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(foilMask, 0, 0);
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "rgb(55,55,55)";
      ctx.fillRect(0, 0, rough.width, rough.height);
      params.metalness = 1;
      params.metalnessMap = this.track(new THREE.CanvasTexture(foilMask));
      params.roughness = 1;
      params.roughnessMap = this.track(new THREE.CanvasTexture(rough));
    }
    const MaterialType = this.design.finish === "gloss" && side === "outside" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const material = this.track(new MaterialType(params));
    if (MaterialType === THREE.MeshPhysicalMaterial) {
      material.clearcoat = 0.8;
      material.clearcoatRoughness = 0.15;
    }
    return material;
  }

  // A w × h panel, `t` thick, with its outside facing +z.
  panel(w, h, t, extra = {}) {
    const outside = extra.plainOutside ? this.face(w, h, "inside", extra) : this.face(w, h, "outside", extra);
    const inside = this.face(w, h, "inside", extra);
    const geometry = this.track(new THREE.BoxGeometry(w, h, t));
    const mesh = new THREE.Mesh(geometry, [this.edge, this.edge, this.edge, this.edge, outside, inside]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

function place(mesh, x, y, z, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

// Bottom and four walls. Returns the group; logo goes on the front wall.
function tray(sk, L, W, H, t, opts = {}) {
  const g = new THREE.Group();
  const extra = (key, logo) => ({ key, logo, plainOutside: opts.plainOutside });
  g.add(place(sk.panel(L, W, t, extra("bottom")), 0, t / 2, 0, Math.PI / 2));
  g.add(place(sk.panel(L, H, t, extra("front", opts.logoFront)), 0, H / 2, W / 2 - t / 2));
  g.add(place(sk.panel(L, H, t, extra("back", opts.logoBack)), 0, H / 2, -W / 2 + t / 2, 0, Math.PI));
  g.add(place(sk.panel(W, H, t, extra("left")), -L / 2 + t / 2, H / 2, 0, 0, -Math.PI / 2));
  g.add(place(sk.panel(W, H, t, extra("right", opts.logoSide)), L / 2 - t / 2, H / 2, 0, 0, Math.PI / 2));
  return g;
}

function mailer(sk, L, W, H, t) {
  const group = tray(sk, L, W, H, t, { logoFront: true });
  const lid = new THREE.Group();
  lid.position.set(0, H, -W / 2);
  lid.add(place(sk.panel(L, W, t, { key: "lid", logo: true, message: "Thank you" }), 0, t / 2, W / 2, -Math.PI / 2));
  const tuck = new THREE.Group();
  tuck.position.set(0, 0, W - 1.5 * t);
  const fh = Math.min(H * 0.8, 2.2);
  tuck.add(place(sk.panel(L - 2 * t, fh, t, { key: "tuck" }), 0, -fh / 2, 0));
  lid.add(tuck);
  group.add(lid);
  return {
    group,
    setOpen(p) {
      lid.rotation.x = -p * 1.95;
      tuck.rotation.x = -p * 0.55;
    },
  };
}

function shipping(sk, L, W, H, t) {
  const group = tray(sk, L, W, H, t, { logoFront: true, logoSide: true, logoBack: true });
  const fd = W / 2;
  const flap = (w, h, key) => sk.panel(w, h, t, { key });
  const front = new THREE.Group();
  front.position.set(0, H, W / 2 - t / 2);
  front.add(place(flap(L, fd, "f1"), 0, t * 1.5, -fd / 2, -Math.PI / 2));
  const back = new THREE.Group();
  back.position.set(0, H, -W / 2 + t / 2);
  back.add(place(flap(L, fd, "f2"), 0, t * 1.5, fd / 2, -Math.PI / 2));
  const left = new THREE.Group();
  left.position.set(-L / 2 + t / 2, H, 0);
  left.add(place(flap(fd, W - 2 * t, "f3"), fd / 2, t / 2, 0, -Math.PI / 2));
  const right = new THREE.Group();
  right.position.set(L / 2 - t / 2, H, 0);
  right.add(place(flap(fd, W - 2 * t, "f4"), -fd / 2, t / 2, 0, -Math.PI / 2));
  const tape = new THREE.Mesh(
    sk.track(new THREE.BoxGeometry(L + 0.02, 0.01, 2)),
    sk.track(new THREE.MeshStandardMaterial({ color: "#e3c9a0", roughness: 0.5, transparent: true, opacity: 0.92 })),
  );
  tape.position.set(0, H + 2 * t + 0.01, 0);
  group.add(front, back, left, right, tape);
  return {
    group,
    setOpen(p) {
      const long = Math.min(1, p * 1.6) * 1.95;
      const short = Math.max(0, p * 1.6 - 0.6) / 1 * 1.85;
      front.rotation.x = long;
      back.rotation.x = -long;
      left.rotation.z = Math.min(short, 1.85);
      right.rotation.z = -Math.min(short, 1.85);
      tape.visible = p < 0.02;
    },
  };
}

function tuckEnd(sk, L, W, H, t) {
  const group = tray(sk, L, W, H, t, { logoFront: true, logoBack: true });
  const fd = Math.min(L * 0.45, W * 0.6);
  const left = new THREE.Group();
  left.position.set(-L / 2 + t / 2, H, 0);
  left.add(place(sk.panel(fd, W * 0.9, t, { key: "d1" }), fd / 2, t / 2, 0, -Math.PI / 2));
  const right = new THREE.Group();
  right.position.set(L / 2 - t / 2, H, 0);
  right.add(place(sk.panel(fd, W * 0.9, t, { key: "d2" }), -fd / 2, t / 2, 0, -Math.PI / 2));
  const lid = new THREE.Group();
  lid.position.set(0, H, -W / 2);
  lid.add(place(sk.panel(L, W, t, { key: "lid" }), 0, t * 1.5, W / 2, -Math.PI / 2));
  const tuck = new THREE.Group();
  tuck.position.set(0, t, W - 1.5 * t);
  const fh = W * 0.6;
  tuck.add(place(sk.panel(L - 2 * t, fh, t, { key: "tuck" }), 0, -fh / 2, 0));
  lid.add(tuck);
  group.add(left, right, lid);
  return {
    group,
    setOpen(p) {
      lid.rotation.x = -p * 1.95;
      tuck.rotation.x = -p * 0.7;
      const d = Math.max(0, p - 0.35) / 0.65;
      left.rotation.z = d * 1.5;
      right.rotation.z = -d * 1.5;
    },
  };
}

function rigid(sk, L, W, H, t) {
  const group = tray(sk, L, W, H, t, {});
  const ld = Math.max(H * 0.4, 0.8);
  const gap = 0.05;
  const iL = L + 2 * gap, iW = W + 2 * gap;
  const lid = new THREE.Group();
  lid.add(place(sk.panel(iL + 2 * t, iW + 2 * t, t, { key: "lidtop", logo: true }), 0, ld - t / 2, 0, -Math.PI / 2));
  lid.add(place(sk.panel(iL + 2 * t, ld, t, { key: "lf" }), 0, ld / 2, iW / 2 + t / 2));
  lid.add(place(sk.panel(iL + 2 * t, ld, t, { key: "lb" }), 0, ld / 2, -iW / 2 - t / 2, 0, Math.PI));
  lid.add(place(sk.panel(iW, ld, t, { key: "ll" }), -iL / 2 - t / 2, ld / 2, 0, 0, -Math.PI / 2));
  lid.add(place(sk.panel(iW, ld, t, { key: "lr" }), iL / 2 + t / 2, ld / 2, 0, 0, Math.PI / 2));
  const restY = H - ld + t;
  lid.position.y = restY;
  group.add(lid);
  return {
    group,
    setOpen(p) {
      const lift = Math.min(1, p * 1.5);
      const tilt = Math.max(0, p * 1.5 - 0.5);
      lid.position.y = restY + lift * H * 0.75 + tilt * H * 0.2;
      lid.position.z = -tilt * W * 0.55;
      lid.rotation.x = -tilt * 0.6;
    },
  };
}

function drawer(sk, L, W, H, t) {
  const group = new THREE.Group();
  group.add(place(sk.panel(L, W, t, { key: "stop", logo: true }), 0, H - t / 2, 0, -Math.PI / 2));
  group.add(place(sk.panel(L, W, t, { key: "sbottom" }), 0, t / 2, 0, Math.PI / 2));
  group.add(place(sk.panel(L, H, t, { key: "sfront", logo: true }), 0, H / 2, W / 2 - t / 2));
  group.add(place(sk.panel(L, H, t, { key: "sback" }), 0, H / 2, -W / 2 + t / 2, 0, Math.PI));
  // The tray is printed in the inside colour on both faces.
  const tL = L - 0.1, tW = W - 2 * t - 0.08, tH = H - 2 * t - 0.08;
  const trayGroup = tray(sk, tL, tW, tH, t * 0.7, { plainOutside: true });
  trayGroup.position.y = t + 0.04;
  const pull = new THREE.Mesh(
    sk.track(new THREE.BoxGeometry(0.06, 0.8, Math.min(1, tW * 0.3))),
    sk.track(new THREE.MeshStandardMaterial({ color: sk.design.logo.color === sk.design.board ? "#d4af6a" : sk.design.logo.color, roughness: 0.6 })),
  );
  pull.position.set(tL / 2 + 0.03, tH * 0.55, 0);
  trayGroup.add(pull);
  group.add(trayGroup);
  return {
    group,
    setOpen(p) {
      trayGroup.position.x = p * L * 0.62;
    },
  };
}

function magnetic(sk, L, W, H, t) {
  const group = tray(sk, L, W, H, t, {});
  group.add(place(sk.panel(L, H, t, { key: "spine" }), 0, H / 2, -W / 2 - t / 2, 0, Math.PI));
  const lid = new THREE.Group();
  lid.position.set(0, H, -W / 2 - t);
  const depth = W + 2 * t;
  lid.add(place(sk.panel(L, depth, t, { key: "lid", logo: true, message: "Made for you" }), 0, t / 2, depth / 2, -Math.PI / 2));
  const flap = new THREE.Group();
  flap.position.set(0, 0, depth);
  const fh = H * 0.55;
  flap.add(place(sk.panel(L, fh, t, { key: "flap" }), 0, -fh / 2, -t / 2));
  lid.add(flap);
  group.add(lid);
  return {
    group,
    setOpen(p) {
      lid.rotation.x = -p * 1.9;
      flap.rotation.x = -p * 1.2;
    },
  };
}

const BUILDERS = { mailer, shipping, tuck: tuckEnd, rigid, drawer, magnetic };

/**
 * Builds a box. options.logoImage: an uploaded logo to print instead of the text.
 * Returns {group, setOpen, size, dispose}. The group is scaled so the largest side is `fit` units.
 */
export function buildBox(design, options = {}) {
  const [L, W, H] = design.dims;
  const t = THICKNESS[design.style] || 0.12;
  const sk = new Skinner(design, options);
  const builder = BUILDERS[design.style] || mailer;
  const model = builder(sk, L, W, H, t);
  const fit = options.fit || 3;
  const k = fit / Math.max(L, W, H);
  const outer = new THREE.Group();
  outer.add(model.group);
  model.group.scale.setScalar(k);
  model.setOpen(options.open || 0);
  return {
    group: outer,
    setOpen: model.setOpen,
    size: new THREE.Vector3(L * k, H * k, W * k),
    dispose() {
      sk.resources.forEach((r) => r.dispose && r.dispose());
    },
  };
}
