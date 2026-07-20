(function () {
  const header = document.getElementById("header");
  const toggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const links = navMenu ? navMenu.querySelectorAll("a") : [];

  /* ---- Header scroll ---- */
  if (header) {
    window.addEventListener("scroll", function () {
      header.classList.toggle("scrolled", window.scrollY > 20);
    });
  }

  /* ---- Mobile nav ---- */
  if (toggle && navMenu) {
    toggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("open");
      toggle.classList.toggle("active", open);
      toggle.setAttribute("aria-expanded", open);
    });

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        navMenu.classList.remove("open");
        toggle.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Hero Carousel ---- */
  (function () {
    var slides = document.querySelectorAll(".hero-slide");
    var dots = document.querySelectorAll(".hero-dot");
    if (!slides.length || !dots.length) return;

    var current = 0;
    var interval;

    function goTo(index) {
      slides[current].classList.remove("active");
      dots[current].classList.remove("active");
      current = index;
      slides[current].classList.add("active");
      dots[current].classList.add("active");
    }

    function next() {
      goTo((current + 1) % slides.length);
    }
    function prev() {
      goTo((current - 1 + slides.length) % slides.length);
    }
    var heroEl = document.querySelector(".hero");
    if (heroEl) {
      var hsx = null, hsy = null;
      heroEl.addEventListener("touchstart", function (e) { hsx = e.touches[0].clientX; hsy = e.touches[0].clientY; }, { passive: true });
      heroEl.addEventListener("touchend", function (e) {
        if (hsx === null) return;
        var dx = e.changedTouches[0].clientX - hsx, dy = e.changedTouches[0].clientY - hsy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else prev(); resetInterval(); }
        hsx = null; hsy = null;
      }, { passive: true });
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goTo(parseInt(this.getAttribute("data-index")));
        resetInterval();
      });
    });

    function resetInterval() {
      clearInterval(interval);
      interval = setInterval(next, 4000);
    }

    interval = setInterval(next, 4000);
  })();

  /* ---- Environment Carousel ---- */
  (function () {
    var track = document.getElementById("envTrack");
    var prevBtn = document.getElementById("envPrev");
    var nextBtn = document.getElementById("envNext");
    var dotsContainer = document.getElementById("envDots");
    if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

    var slides = track.querySelectorAll(".env-carousel-slide");
    var total = slides.length;
    var current = 0;
    var interval;

    /* Build dots */
    for (var i = 0; i < total; i++) {
      var dot = document.createElement("button");
      dot.className = "env-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Slide " + (i + 1));
      dot.setAttribute("data-index", i);
      dotsContainer.appendChild(dot);
    }

    var dots = dotsContainer.querySelectorAll(".env-dot");

    function goTo(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      current = index;
      track.style.transform = "translateX(-" + (current * 100) + "%)";
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === current);
      });
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    nextBtn.addEventListener("click", function () { next(); resetInterval(); });
    prevBtn.addEventListener("click", function () { prev(); resetInterval(); });

    dotsContainer.addEventListener("click", function (e) {
      if (e.target.classList.contains("env-dot")) {
        goTo(parseInt(e.target.getAttribute("data-index")));
        resetInterval();
      }
    });

    /* Swipe support */
    var touchStartX = 0;
    var touchEndX = 0;

    track.addEventListener("touchstart", function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener("touchend", function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next();
        else prev();
        resetInterval();
      }
    });

    function resetInterval() {
      clearInterval(interval);
      interval = setInterval(next, 4000);
    }

    interval = setInterval(next, 4000);
  })();

  /* ---- Intersection Observer ---- */
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".service-card, .feature, .intro-text, .env-carousel").forEach(function (el) {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });

  var style = document.createElement("style");
  style.textContent = ".visible { opacity: 1 !important; transform: translateY(0) !important; }";
  document.head.appendChild(style);

  /* ---- option-card sync: booking link follows selected duration ---- */
  document.querySelectorAll('.service-card').forEach(function (card) {
    var radios = card.querySelectorAll('.opt-row input[type="radio"]');
    var btn = card.querySelector('.btn-booking');
    if (!radios.length || !btn) return;
    function sync() {
      var sel = card.querySelector('.opt-row input[type="radio"]:checked');
      if (sel) { var lg = document.documentElement.lang === 'ja' ? 'jp' : (document.documentElement.lang === 'zh-CN' ? 'cn' : 'en'); btn.setAttribute('href', '../booking.html?lang=' + lg + '&service=' + encodeURIComponent(sel.value)); }
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    sync();
  });

  /* ---- Back to Top ---- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("visible", window.scrollY > 600);
    });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();

/* ---- Pass the selected service option into the Booking page (checklist #9/#47) ---- */
(function () {
  function currentLang() {
    var p = location.pathname;
    if (p.indexOf("/cn/") !== -1) return "cn";
    if (p.indexOf("/en/") !== -1) return "en";
    return "jp";
  }
  document.querySelectorAll(".btn-booking").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var card = btn.closest(".service-card");
      if (!card) return; // visit-section button etc. -> keep default href
      var sel = card.querySelector('input[type="radio"]:checked');
      if (!sel || !sel.value) return;
      e.preventDefault();
      location.href = "../booking.html?lang=" + currentLang() + "&service=" + encodeURIComponent(sel.value);
    });
  });
})();

/* ---- Collapsible service groups (fold same-item durations; tap head to show all) ---- */
(function () {
  document.querySelectorAll(".opt-group-head").forEach(function (head) {
    head.addEventListener("click", function () {
      var g = head.closest(".opt-group");
      if (!g) return;
      var open = g.getAttribute("data-open") === "true";
      g.setAttribute("data-open", open ? "false" : "true");
      head.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  /* keep a group open when a radio inside it becomes selected */
  document.querySelectorAll('.opt-group input[type="radio"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var g = r.closest(".opt-group");
      if (g) {
        g.setAttribute("data-open", "true");
        var h = g.querySelector(".opt-group-head");
        if (h) h.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
