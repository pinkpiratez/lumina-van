/**
 * Scroll reveal + light hero parallax
 * Content fades in as sections enter the viewport.
 */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.getElementById("site-header");
const toggle = document.getElementById("nav-toggle");
const mobileNav = document.getElementById("nav-mobile");
const band = document.querySelector(".band");
const heroMedia = document.querySelector(".hero-media");

function onScrollChrome() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

toggle?.addEventListener("click", () => {
  const open = mobileNav?.hasAttribute("hidden");
  if (open) {
    mobileNav.removeAttribute("hidden");
    toggle.setAttribute("aria-expanded", "true");
  } else {
    mobileNav.setAttribute("hidden", "");
    toggle.setAttribute("aria-expanded", "false");
  }
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.setAttribute("hidden", "");
    toggle?.setAttribute("aria-expanded", "false");
  });
});

/* ── Reveal on scroll ── */
const revealEls = [...document.querySelectorAll(".reveal")];

if (reduceMotion) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          // Keep visible once revealed (no flicker on bounce scroll)
          io.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  for (const el of revealEls) {
    // Hero already marked visible in HTML
    if (el.classList.contains("is-visible")) continue;
    io.observe(el);
  }
}

/* ── Soft parallax (hero + band only) ── */
let ticking = false;

function updateParallax() {
  if (reduceMotion) return;
  const vh = window.innerHeight;

  if (heroMedia) {
    const hero = heroMedia.parentElement;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh) {
      const progress = -rect.top / Math.max(rect.height, 1);
      const speed = Number(heroMedia.dataset.parallax) || 0.22;
      heroMedia.style.transform = `translate3d(0, ${progress * speed * 80}px, 0)`;
    }
  }

  if (band) {
    const rect = band.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh) {
      const speed = Number(band.dataset.parallaxBg) || 0.18;
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      band.style.backgroundPosition = `center ${50 + progress * speed * 20}%`;
    }
  }
}

function onScroll() {
  onScrollChrome();
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateParallax();
    ticking = false;
  });
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

document.querySelectorAll(".contact-form").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type='submit']");
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = "Submitted";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = prev;
      btn.disabled = false;
      form.reset();
    }, 2200);
  });
});
