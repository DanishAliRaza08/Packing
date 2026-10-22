// Interactive 3D box viewer, plus a thumbnail renderer that shares one WebGL context.
import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";
import { buildBox } from "./models.js";

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7b0, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return scene;
}

function makeRenderer(canvas, alpha = true, preserve = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function frame(camera, size, controls, zoom = 1) {
  const radius = (Math.max(size.x, size.y, size.z) * 0.95 + 0.6) * zoom;
  const target = new THREE.Vector3(0, size.y * 0.45, 0);
  const dir = new THREE.Vector3(1.0, 0.75, 1.35).normalize();
  const dist = radius / Math.sin((camera.fov * Math.PI) / 360) * 0.85;
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
  if (controls) {
    controls.target.copy(target);
    controls.minDistance = dist * 0.45;
    controls.maxDistance = dist * 2.2;
    controls.update();
  }
}

function tween(from, to, seconds, onUpdate) {
  if (window.gsap && !reducedMotion) {
    const state = { v: from };
    return window.gsap.to(state, { v: to, duration: seconds, ease: "power3.inOut", onUpdate: () => onUpdate(state.v) });
  }
  onUpdate(to);
  return null;
}

export class BoxViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "box3d-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    this.renderer = makeRenderer(this.canvas);
    this.scene = makeScene(this.renderer);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotate = options.autoRotate !== false && !reducedMotion;
    this.controls.autoRotateSpeed = 1.2;
    this.controls.enableZoom = options.zoom !== false;
    this.controls.addEventListener("start", () => { this.controls.autoRotate = false; this.container.classList.add("touched"); });
    this.openness = 0;
    this.box = null;
    this.visible = true;
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver((entries) => { this.visible = entries[0].isIntersecting; });
      this.observer.observe(container);
    }
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  load(design, options = {}) {
    if (this.box) {
      this.scene.remove(this.box.group);
      this.box.dispose();
    }
    this.design = design;
    this.box = buildBox(design, { logoImage: options.logoImage, open: this.openness });
    this.scene.add(this.box.group);
    if (!options.keepCamera) frame(this.camera, this.box.size, this.controls);
    if (options.spin && window.gsap && !reducedMotion) {
      window.gsap.from(this.box.group.rotation, { y: -Math.PI * 0.8, duration: 1.1, ease: "power3.out" });
      window.gsap.from(this.box.group.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 0.9, ease: "back.out(1.6)" });
    }
    return this;
  }

  setOpen(value, animate = true) {
    if (this.openTween) this.openTween.kill();
    const apply = (v) => { this.openness = v; if (this.box) this.box.setOpen(v); };
    if (animate) this.openTween = tween(this.openness, value, 1.2, apply);
    else apply(value);
  }

  toggleOpen() {
    const next = this.openness > 0.5 ? 0 : 1;
    this.setOpen(next);
    return next === 1;
  }

  setAutoRotate(on) {
    this.controls.autoRotate = on && !reducedMotion;
  }

  resetView() {
    if (this.box) frame(this.camera, this.box.size, this.controls);
  }

  snapshot() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/png");
  }

  loop() {
    if (this.disposed) return;
    requestAnimationFrame(this.loop);
    if (!this.visible) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener("resize", this._onResize);
    if (this.observer) this.observer.disconnect();
    if (this.box) this.box.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

// Renders design thumbnails one at a time with a single hidden renderer.
let thumbRenderer = null;
let thumbScene = null;
const thumbCamera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);
const thumbQueue = [];
let thumbBusy = false;

function nextThumb() {
  if (thumbBusy || !thumbQueue.length) return;
  thumbBusy = true;
  const { design, img, open } = thumbQueue.shift();
  const run = () => {
    try {
      if (!thumbRenderer) {
        const canvas = document.createElement("canvas");
        thumbRenderer = makeRenderer(canvas, true, true);
        thumbRenderer.setPixelRatio(1);
        thumbRenderer.shadowMap.type = THREE.PCFShadowMap;
        thumbRenderer.setSize(560, 420, false);
        thumbScene = makeScene(thumbRenderer);
      }
      const box = buildBox(design, { open, quality: 0.5 });
      thumbScene.add(box.group);
      frame(thumbCamera, box.size, null, 0.86);
      thumbRenderer.render(thumbScene, thumbCamera);
      img.src = thumbRenderer.domElement.toDataURL("image/webp", 0.85);
      img.closest("[data-thumb-wrap]")?.classList.add("ready");
      thumbScene.remove(box.group);
      box.dispose();
    } catch (e) {
      console.warn("Thumbnail failed", e);
    }
    thumbBusy = false;
    nextThumb();
  };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 16)))(run);
}

export function queueThumbnail(design, img, open = 0.35) {
  thumbQueue.push({ design, img, open });
  nextThumb();
}
