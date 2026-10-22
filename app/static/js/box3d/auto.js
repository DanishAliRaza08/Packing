// Starts 3D viewers ([data-box3d]) and thumbnails (img[data-thumb]) found on the page.
import { BoxViewer, queueThumbnail, reducedMotion, webglAvailable } from "./viewer.js";

const dataEl = document.getElementById("box-designs");
export const DESIGNS = dataEl ? JSON.parse(dataEl.textContent) : [];
export const DESIGNS_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));
export const HAS_WEBGL = webglAvailable();

export const fontsReady = Promise.all([
  document.fonts?.load("600 40px Fraunces"),
  document.fonts?.load("italic 600 40px Fraunces"),
  document.fonts?.load("600 40px Inter"),
]).catch(() => null);

function whenNear(el, callback) {
  if (!("IntersectionObserver" in window)) return callback();
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      callback();
    }
  }, { rootMargin: "300px" });
  io.observe(el);
}

function startViewer(el) {
  const design = DESIGNS_BY_ID[el.dataset.box3d];
  if (!design) return;
  whenNear(el, async () => {
    await fontsReady;
    const stage = el.querySelector(".box3d-stage") || el;
    const viewer = new BoxViewer(stage, { autoRotate: el.dataset.autorotate !== "false", zoom: el.dataset.zoom === "true" });
    viewer.load(design, { spin: true });
    el.classList.add("ready");
    el.viewer = viewer;

    const openBtn = el.querySelector("[data-box-open]");
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        const open = viewer.toggleOpen();
        openBtn.setAttribute("aria-pressed", open ? "true" : "false");
        openBtn.textContent = open ? "Close box" : "Open box";
      });
    }

    // On the home page the lid opens as you scroll past the hero.
    if (el.hasAttribute("data-scroll-open") && window.gsap && window.ScrollTrigger && !reducedMotion) {
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 15%",
        end: "+=320",
        scrub: 0.6,
        onUpdate: (self) => viewer.setOpen(self.progress, false),
      });
    } else if (el.hasAttribute("data-open-on-load") && !reducedMotion) {
      setTimeout(() => viewer.setOpen(1), 1200);
    }
  });
}

export function startThumbnails(root = document) {
  root.querySelectorAll("img[data-thumb]").forEach((img) => {
    if (img.dataset.thumbStarted) return;
    const design = DESIGNS_BY_ID[img.dataset.thumb];
    if (!design) return;
    img.dataset.thumbStarted = "1";
    whenNear(img, async () => {
      await fontsReady;
      queueThumbnail(design, img);
    });
  });
}

if (HAS_WEBGL && DESIGNS.length) {
  document.documentElement.classList.add("webgl");
  document.querySelectorAll("[data-box3d]").forEach(startViewer);
  startThumbnails();
} else {
  document.documentElement.classList.add("no-webgl");
}
