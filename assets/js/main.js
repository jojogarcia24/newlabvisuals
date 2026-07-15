/* ============================================================
   ALL THINGS REELestate — interactions
   ============================================================ */
(function () {
  "use strict";

  var doc = document;

  /* ---------- Hero background video ---------- */
  var heroVideo = doc.getElementById("heroVideo");
  if (heroVideo) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var reveal = function () { heroVideo.classList.add("ready"); };
    heroVideo.addEventListener("loadeddata", reveal);
    heroVideo.addEventListener("playing", reveal);
    // Always mute (required for autoplay on mobile) and play inline.
    heroVideo.muted = true;
    heroVideo.setAttribute("muted", "");
    heroVideo.playsInline = true;
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.addEventListener("loadeddata", function () { try { heroVideo.pause(); } catch (e) {} });
    } else {
      var tryPlay = function () {
        heroVideo.muted = true;
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {});
      };
      ["loadedmetadata", "canplay", "canplaythrough"].forEach(function (ev) { heroVideo.addEventListener(ev, tryPlay); });
      if (heroVideo.readyState >= 2) { tryPlay(); reveal(); }
      heroVideo.load();
      // Fallback for iOS Low Power Mode / blocked autoplay: keep trying on any
      // interaction until it actually plays, then stop listening.
      var kickEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"];
      var kick = function () { tryPlay(); };
      var stopKicks = function () { kickEvents.forEach(function (ev) { window.removeEventListener(ev, kick); }); };
      kickEvents.forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
      heroVideo.addEventListener("playing", stopKicks);
      // Resume when returning to the tab.
      doc.addEventListener("visibilitychange", function () { if (!doc.hidden) tryPlay(); });
    }
  }

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

  /* ---------- Matterport 3D tour lightbox ---------- */
  var mpLightbox = doc.getElementById("mpLightbox");
  var mpFrame = doc.getElementById("mpFrame");
  if (mpLightbox && mpFrame) {
    var openMp = function (id) {
      mpFrame.src = "https://my.matterport.com/show/?m=" + id + "&play=1";
      mpLightbox.hidden = false;
      doc.body.style.overflow = "hidden";
    };
    var closeMp = function () {
      mpLightbox.hidden = true;
      mpFrame.src = "";
      doc.body.style.overflow = "";
    };
    doc.querySelectorAll("[data-mp]").forEach(function (el) {
      el.addEventListener("click", function () { openMp(el.getAttribute("data-mp")); });
    });
    var mpClose = doc.getElementById("mpClose");
    if (mpClose) mpClose.addEventListener("click", closeMp);
    mpLightbox.addEventListener("click", function (e) { if (e.target === mpLightbox) closeMp(); });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMp(); });
  }

  /* ---------- Matterport preview thumbnails (best-effort via oEmbed) ---------- */
  doc.querySelectorAll(".tour-card[data-mp]").forEach(function (card) {
    var id = card.getAttribute("data-mp");
    var apply = function (url) {
      if (!url) return;
      var img = card.querySelector(".tour-card__img");
      if (!img) { img = doc.createElement("img"); img.className = "tour-card__img"; img.alt = ""; img.loading = "lazy"; card.insertBefore(img, card.firstChild); }
      img.onerror = function () { img.remove(); };
      img.style.display = "";
      img.src = url;
    };
    fetch("https://my.matterport.com/api/v1/models/oembed?format=json&url=" + encodeURIComponent("https://my.matterport.com/show/?m=" + id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.thumbnail_url) apply(j.thumbnail_url); })
      .catch(function () { /* keep the direct thumb / gradient fallback */ });
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

  /* ---------- PWA: service worker + install ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  var deferredPrompt = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var ua = navigator.userAgent || "";
  var isIOS = /iP(hone|ad|od)/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var installBtns = ["installBtn", "installBtnMenu"].map(function (id) { return doc.getElementById(id); }).filter(Boolean);

  var banner = doc.getElementById("installBanner");
  var iosSteps = doc.getElementById("iosSteps");
  var DISMISS_KEY = "atr_install_dismissed";
  function dismissed() {
    try { return Date.now() - parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10) < 6048e5; } catch (e) { return false; } // 7 days
  }
  function showButtons() { installBtns.forEach(function (b) { b.hidden = false; }); }
  function hideButtons() { installBtns.forEach(function (b) { b.hidden = true; }); }
  function showBanner() { if (banner && !dismissed()) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  var genericSteps = doc.getElementById("genericSteps");
  var installGo = doc.getElementById("installGo");
  // mode: 'prompt' (one-tap Install works) | 'ios' (Share→Add) | 'generic' (browser menu)
  function setMode(mode) {
    if (installGo) installGo.hidden = mode !== "prompt";      // only offer one-tap where it actually installs
    if (iosSteps) iosSteps.hidden = mode !== "ios";
    if (genericSteps) genericSteps.hidden = mode !== "generic";
  }

  // The manual entry point (nav + menu) is always available until installed.
  if (!standalone) showButtons();
  setMode(isIOS ? "ios" : "generic");

  // Android / desktop Chromium fire this — enables the real one-tap install.
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setMode("prompt");
    if (!standalone) { showButtons(); showBanner(); }
  });

  // iOS/iPadOS Safari can't install programmatically — surface the dismissible
  // Share → Add to Home Screen directions after a moment (unless dismissed).
  if (isIOS && !standalone) {
    setTimeout(function () { if (!deferredPrompt) showBanner(); }, 900);
  }

  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () { deferredPrompt = null; hideButtons(); hideBanner(); });
      return;
    }
    // No native prompt: reveal the banner with the right instructions.
    if (banner) banner.hidden = false;
    setMode(isIOS ? "ios" : "generic");
  }
  installBtns.forEach(function (b) { b.addEventListener("click", triggerInstall); });
  if (installGo) installGo.addEventListener("click", triggerInstall);

  var installClose = doc.getElementById("installClose");
  if (installClose) installClose.addEventListener("click", function () {
    hideBanner();
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  });

  window.addEventListener("appinstalled", function () { hideButtons(); hideBanner(); });

  /* ---------- Year ---------- */
  var y = doc.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
