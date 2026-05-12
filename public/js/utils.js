// ── Shared utilities ──────────────────────────────────────────────────────────
// Loaded by both the public site and the admin panel.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function initials(name) {
  return String(name).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/**
 * Resize and JPEG-compress an image File before uploading.
 * Returns a base64 data URL.
 * @param {File} file
 * @param {number} maxDim  – longest edge in px (default 1200)
 * @param {number} quality – JPEG quality 0–1 (default 0.75)
 */
function resizeImage(file, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}
