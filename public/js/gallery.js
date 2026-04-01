// ── Gallery loader + lightbox ─────────────────────────────────────────────────
// Fetches photos from /api/gallery and renders the grid.
// Exposes window._galleryReady (Promise) so nav.js can await it before scrolling.
// Requires: utils.js (escHtml)

let galleryPhotos = [];

function renderGallery(photos) {
  const grid = document.getElementById('gallery-grid');
  const sorted = photos.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!sorted.length) {
    grid.closest('section').style.display = 'none';
    return;
  }

  galleryPhotos = sorted;
  grid.innerHTML = sorted.map((p, i) => `
    <button class="gallery-item reveal" data-index="${i}" aria-label="${escHtml(p.caption || 'View photo')}">
      <img src="${p.image}" alt="${escHtml(p.caption || '')}" loading="lazy" />
      ${p.caption ? `<span class="gallery-caption">${escHtml(p.caption)}</span>` : ''}
    </button>`).join('');

  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.classList.add('visible');
    el.addEventListener('click', () => openLightbox(parseInt(el.dataset.index, 10)));
  });
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

let lightboxIndex = 0;
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose   = document.getElementById('lightbox-close');
const lightboxPrev    = document.getElementById('lightbox-prev');
const lightboxNext    = document.getElementById('lightbox-next');

function openLightbox(index) {
  lightboxIndex = index;
  showLightboxPhoto();
  lightbox.classList.add('open');
  document.body.classList.add('lightbox-open');
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.classList.remove('lightbox-open');
}

function showLightboxPhoto() {
  const p = galleryPhotos[lightboxIndex];
  if (!p) return;
  lightboxImg.src           = p.image;
  lightboxImg.alt           = p.caption || '';
  lightboxCaption.textContent = p.caption || '';
  lightboxPrev.style.display = galleryPhotos.length > 1 ? '' : 'none';
  lightboxNext.style.display = galleryPhotos.length > 1 ? '' : 'none';
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  showLightboxPhoto();
});
lightboxNext.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % galleryPhotos.length;
  showLightboxPhoto();
});

lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   { lightboxIndex = (lightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length; showLightboxPhoto(); }
  if (e.key === 'ArrowRight')  { lightboxIndex = (lightboxIndex + 1) % galleryPhotos.length; showLightboxPhoto(); }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

window._galleryReady = fetch('/api/gallery')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(renderGallery)
  .catch(() => {
    const grid = document.getElementById('gallery-grid');
    grid.closest('section').style.display = 'none';
  });
