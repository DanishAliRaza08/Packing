// Page animations with GSAP. Skipped entirely when the visitor prefers reduced motion.
(function () {
  "use strict";
  var gsap = window.gsap;
  if (!gsap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  document.documentElement.classList.add("motion");

  // Hero entrance
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    var items = hero.querySelectorAll("[data-hero-item]");
    var trust = hero.querySelectorAll(".trust-bar li");
    if (items.length) tl.from(items, { y: 28, opacity: 0, duration: 0.9, stagger: 0.09 });
    if (trust.length) tl.from(trust, { y: 14, opacity: 0, duration: 0.5, stagger: 0.06 }, "-=0.4");
  }

  // Fade-up any element marked data-reveal; grids reveal their children one after another.
  if (window.ScrollTrigger) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      var targets = el.hasAttribute("data-reveal-children") ? el.children : el;
      if (!targets || targets.length === 0) return;
      gsap.from(targets, {
        y: 36, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 85%", once: true }
      });
    });

    // Count-up numbers
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString(); }
      });
    });

    // Draw the line through the "how it works" steps
    var line = document.querySelector(".steps-line span");
    if (line) {
      gsap.fromTo(line, { scaleX: 0 }, {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: ".steps", start: "top 80%", end: "bottom 60%", scrub: true }
      });
    }

    // Gentle parallax on the design marquee
    var marquee = document.querySelector("[data-marquee]");
    if (marquee) {
      gsap.to(marquee, {
        xPercent: -18, ease: "none",
        scrollTrigger: { trigger: marquee, start: "top bottom", end: "bottom top", scrub: true }
      });
    }
  }

  // Shrink the header after scrolling
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 24); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Buttons lift slightly towards the pointer
  gsap.utils.toArray(".btn-primary.btn-lg").forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.12, y: (e.clientY - r.top - r.height / 2) * 0.2, duration: 0.3 });
    });
    btn.addEventListener("pointerleave", function () { gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" }); });
  });
})();
