// ── Board members loader ──────────────────────────────────────────────────────
// Fetches board members from /api/board and renders the grid.
// Exposes window._boardReady (Promise) so nav.js can await it before scrolling.
// Requires: utils.js (escHtml)

function memberHTML(m) {
  const photo = m.image
    ? `<img class="board-photo" src="${m.image}" alt="${escHtml(m.name)}" loading="lazy" />`
    : `<div class="board-initials">${escHtml(initials(m.name))}</div>`;
  return `<div class="board-card reveal">
    ${photo}
    <div class="board-name">${escHtml(m.name)}</div>
    <div class="board-role">${escHtml(m.role)}</div>
    ${m.bio ? `<p class="board-bio">${escHtml(m.bio)}</p>` : ''}
  </div>`;
}

function renderBoard(members) {
  const grid   = document.getElementById('board-grid');
  const sorted = members.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  if (!sorted.length) {
    grid.closest('section').style.display = 'none';
    return;
  }

  grid.innerHTML = sorted.map(memberHTML).join('');
  grid.querySelectorAll('.board-card').forEach(el => el.classList.add('visible'));
}

window._boardReady = fetch('/api/board')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(renderBoard)
  .catch(() => {
    const grid = document.getElementById('board-grid');
    grid.closest('section').style.display = 'none';
  });
