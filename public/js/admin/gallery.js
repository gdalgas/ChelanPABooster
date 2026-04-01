// ── Gallery admin ─────────────────────────────────────────────────────────────
// Requires: utils.js (escHtml, escAttr), auth.js (authHeaders, handleUnauthorized)

let allPhotos = [];
let pendingGalleryImage = '';

const galleryForm        = document.getElementById('gallery-form');
const gallerySubmit      = document.getElementById('gallery-submit-btn');
const galleryFormMsg     = document.getElementById('gallery-form-msg');
const galleryImageInput  = document.getElementById('g-image');
const galleryImagePreview= document.getElementById('g-image-preview');
const galleryLoading     = document.getElementById('gallery-loading');
const galleryAdminGrid   = document.getElementById('gallery-admin-grid');

async function loadGallery() {
  galleryLoading.style.display = 'block';
  galleryAdminGrid.style.display = 'none';
  try {
    const res = await fetch('/api/gallery');
    if (!res.ok) throw new Error('Failed to load');
    allPhotos = await res.json();
    renderAdminGallery();
  } catch {
    galleryLoading.textContent = 'Failed to load photos.';
  }
}

function renderAdminGallery() {
  const sorted = allPhotos.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  galleryAdminGrid.innerHTML = sorted.length
    ? sorted.map(galleryThumbHTML).join('')
    : '<div class="empty-state">No photos yet.</div>';
  galleryLoading.style.display = 'none';
  galleryAdminGrid.style.display = 'block';
}

function galleryThumbHTML(p) {
  return `<div class="gallery-admin-thumb">
    <img src="${p.image}" alt="${escHtml(p.caption || '')}" />
    ${p.caption ? `<div class="gallery-admin-caption">${escHtml(p.caption)}</div>` : ''}
    <button class="btn btn-danger btn-sm gallery-admin-delete"
      onclick="confirmDeletePhoto('${p.id}', '${escAttr(p.caption || 'this photo')}')">Delete</button>
  </div>`;
}

galleryImageInput.addEventListener('change', () => {
  const file = galleryImageInput.files[0];
  if (!file) { pendingGalleryImage = ''; galleryImagePreview.classList.remove('visible'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    pendingGalleryImage = e.target.result;
    galleryImagePreview.src = pendingGalleryImage;
    galleryImagePreview.classList.add('visible');
  };
  reader.readAsDataURL(file);
});

galleryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingGalleryImage) {
    setGalleryFormMsg('Please select a photo.', 'error');
    return;
  }
  const payload = {
    caption: document.getElementById('g-caption').value.trim(),
    order:   parseInt(document.getElementById('g-order').value, 10) || 0,
    image:   pendingGalleryImage,
  };
  gallerySubmit.disabled = true;
  setGalleryFormMsg('');
  try {
    const res = await fetch('/api/gallery', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error('Upload failed');
    setGalleryFormMsg('Photo uploaded.', 'success');
    galleryForm.reset();
    pendingGalleryImage = '';
    galleryImagePreview.src = '';
    galleryImagePreview.classList.remove('visible');
    await loadGallery();
  } catch {
    setGalleryFormMsg('Upload failed. Please try again.', 'error');
  } finally {
    gallerySubmit.disabled = false;
  }
});

function setGalleryFormMsg(msg, type = '') {
  if (!msg) { galleryFormMsg.textContent = ''; galleryFormMsg.className = 'form-msg'; return; }
  galleryFormMsg.textContent = msg;
  galleryFormMsg.className   = `form-msg alert alert-${type}`;
}
