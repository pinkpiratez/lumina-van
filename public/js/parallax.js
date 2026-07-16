/**
 * Lumina — subtle parallax + header / mobile nav
 */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.getElementById("site-header");
const toggle = document.getElementById("nav-toggle");
const mobileNav = document.getElementById("nav-mobile");
const band = document.querySelector(".band");
const layers = [...document.querySelectorAll("[data-parallax]")];

function onScrollChrome() {
  header?.classList.toggle("is-scrolled", window.scrollY > 40);
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

let ticking = false;

function updateParallax() {
  if (reduceMotion) return;
  const vh = window.innerHeight;

  for (const el of layers) {
    const speed = Number(el.dataset.parallax) || 0.2;
    const host = el.parentElement ?? el;
    const rect = host.getBoundingClientRect();
    const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
    el.style.transform = `translate3d(0, ${progress * speed * 120}px, 0)`;
  }

  if (band) {
    const rect = band.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh) {
      const speed = Number(band.dataset.parallaxBg) || 0.25;
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      const y = 50 + progress * speed * 28;
      band.style.backgroundPosition = `center ${y}%`;
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

document.querySelector(".contact-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  if (!btn) return;
  const prev = btn.innerHTML;
  btn.innerHTML = "Sent — we’ll reply soon ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = prev;
    btn.disabled = false;
    e.target.reset();
  }, 2600);
});
