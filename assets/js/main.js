/* ============================================================
   ALL THINGS REELestate — interactions
   ============================================================ */
(function () {
  "use strict";

  var doc = document;

  /* ---------- Nav: solid on scroll ---------- */
  var nav = doc.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = doc.getElementById("burger");
  var menu = doc.getElementById("mobileMenu");
  function closeMenu() {
    doc.body.classList.remove("nav-open");
    burger.setAttribute("aria-expanded", "false");
  }
  burger.addEventListener("click", function () {
    var open = doc.body.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Portfolio: subtle pointer tilt ---------- */
  var tiltEls = doc.querySelectorAll(".reel-tile, .reel-feature");
  var canHover = window.matchMedia("(hover: hover)").matches;
  if (canHover) {
    tiltEls.forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(900px) rotateY(" + x * 4 + "deg) rotateX(" + -y * 4 + "deg) translateY(-5px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---------- Portfolio play buttons (placeholder hook) ---------- */
  doc.querySelectorAll("[data-video], .reel-tile, .play").forEach(function (el) {
    el.addEventListener("click", function () {
      /* Drop a real embed here (Vimeo / YouTube / hosted mp4).
         For now, route interest to the contact form. */
      var contact = doc.getElementById("contact");
      if (contact) contact.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- Contact form (demo) ---------- */
  var form = doc.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      form.classList.add("sent");
      /* Wire to your endpoint / CRM / email service here. */
    });
  }

  /* ---------- PWA: service worker + install prompt ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
  var installBtn = doc.getElementById("installBtn");
  var deferredPrompt = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn && !standalone) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () { deferredPrompt = null; installBtn.hidden = true; });
    });
  }
  window.addEventListener("appinstalled", function () { if (installBtn) installBtn.hidden = true; });

  /* ---------- Year ---------- */
  var y = doc.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
