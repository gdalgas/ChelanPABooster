// ── Nav scroll state ─────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Hamburger menu ───────────────────────────────────────────────────────────
const hamburger = document.getElementById('nav-hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// ── Anchor scroll (deferred for sections below dynamic content) ───────────────
// Sections whose position shifts when dynamic content (events) loads above them
const DYNAMIC_ANCHORS = new Set(['#events', '#board', '#gallery', '#about']);

function scrollToAnchor(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  const navH = document.getElementById('nav').offsetHeight;
  const top  = el.getBoundingClientRect().top + window.scrollY - navH;
  window.scrollTo({ top, behavior: 'smooth' });
}

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', (e) => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');

    const href = a.getAttribute('href');
    if (!href || !DYNAMIC_ANCHORS.has(href)) return;

    e.preventDefault();
    history.pushState(null, '', href);
    // Wait for dynamic sections to finish rendering before scrolling
    Promise.allSettled([window._eventsReady, window._boardReady, window._galleryReady]).then(() => {
      scrollToAnchor(href);
    });
  });
});
