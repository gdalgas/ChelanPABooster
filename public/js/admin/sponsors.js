// ── Sponsors admin ────────────────────────────────────────────────────────────
// Requires: utils.js (escHtml, escAttr), auth.js (authHeaders, handleUnauthorized)

const TIERS = {
  patron:    { label: 'Patron',    amount: '$25',   desc: 'Individual / Alumni' },
  artist:    { label: 'Artist',    amount: '$50',   desc: 'Local Families' },
  spotlight: { label: 'Spotlight', amount: '$100',  desc: 'Community Leaders / Small Businesses' },
  producer:  { label: 'Producer',  amount: '$250',  desc: 'Local Chelan Businesses' },
};
// Higher tier = shown first in the list
const TIER_RANK = { producer: 0, spotlight: 1, artist: 2, patron: 3 };

let allSponsors = [];
let sponsorsVisible = true;

const sponsorForm      = document.getElementById('sponsor-form');
const sponsorSubmit    = document.getElementById('sponsor-submit-btn');
const sponsorCancelBtn = document.getElementById('sponsor-cancel-btn');
const sponsorFormTitle = document.getElementById('sponsor-form-title');
const sponsorFormMsg   = document.getElementById('sponsor-form-msg');
const sponsorsLoading  = document.getElementById('sponsors-loading');
const sponsorsList     = document.getElementById('sponsors-list');
const visibleToggle    = document.getElementById('sponsors-visible-toggle');
const settingsMsg      = document.getElementById('sponsors-settings-msg');

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadSponsors() {
  sponsorsLoading.style.display = 'block';
  sponsorsList.style.display = 'none';
  try {
    const res = await fetch('/api/sponsors');
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    allSponsors = data.items || [];
    sponsorsVisible = data.visible !== false;
    updateVisibleToggle();
    renderSponsorsList();
  } catch {
    sponsorsLoading.textContent = 'Failed to load sponsors.';
  }
}

// ── Visibility toggle ─────────────────────────────────────────────────────────

function updateVisibleToggle() {
  visibleToggle.textContent     = sponsorsVisible ? 'Visible' : 'Hidden';
  visibleToggle.dataset.visible = String(sponsorsVisible);
  visibleToggle.className = sponsorsVisible
    ? 'btn btn-primary btn-sm'
    : 'btn btn-outline btn-sm';
}

visibleToggle.addEventListener('click', async () => {
  const next = !sponsorsVisible;
  visibleToggle.disabled = true;
  setSettingsMsg('');
  try {
    const res = await fetch('/api/sponsors/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ visible: next }),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error();
    sponsorsVisible = next;
    updateVisibleToggle();
    setSettingsMsg(next ? 'Banner is now visible.' : 'Banner is now hidden.', 'success');
  } catch {
    setSettingsMsg('Failed to update. Please try again.', 'error');
  } finally {
    visibleToggle.disabled = false;
  }
});

function setSettingsMsg(msg, type = '') {
  if (!msg) { settingsMsg.textContent = ''; settingsMsg.className = 'form-msg'; return; }
  settingsMsg.textContent = msg;
  settingsMsg.className   = `form-msg alert alert-${type}`;
}

// ── Render list ───────────────────────────────────────────────────────────────

function renderSponsorsList() {
  const sorted = allSponsors.slice().sort((a, b) => {
    const rankDiff = (TIER_RANK[a.level] ?? 99) - (TIER_RANK[b.level] ?? 99);
    return rankDiff !== 0 ? rankDiff : (a.order ?? 0) - (b.order ?? 0);
  });

  if (!sorted.length) {
    sponsorsList.innerHTML = '<div class="empty-state">No sponsors yet.</div>';
  } else {
    // Group by tier for display
    let html = '';
    let lastTier = null;
    for (const s of sorted) {
      if (s.level !== lastTier) {
        const t = TIERS[s.level] || { label: s.level, amount: '' };
        html += `<div class="section-divider">${t.label} — ${t.amount}</div>`;
        lastTier = s.level;
      }
      html += sponsorRowHTML(s);
    }
    sponsorsList.innerHTML = html;
  }

  sponsorsLoading.style.display = 'none';
  sponsorsList.style.display = 'block';
}

function sponsorRowHTML(s) {
  const urlPart = s.url
    ? `<a href="${escHtml(s.url)}" target="_blank" rel="noopener" class="item-meta">${escHtml(s.url)}</a>`
    : '<span class="item-meta">No URL</span>';
  return `<div class="list-item">
    <div class="item-info">
      <div class="item-name">${escHtml(s.name)}</div>
      ${urlPart}
    </div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm" onclick="editSponsor('${s.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteSponsor('${s.id}', '${escAttr(s.name)}')">Delete</button>
    </div>
  </div>`;
}

// ── Add / Edit form ───────────────────────────────────────────────────────────

sponsorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('sp-edit-id').value;
  const payload = {
    name:  document.getElementById('sp-name').value.trim(),
    url:   document.getElementById('sp-url').value.trim(),
    level: document.getElementById('sp-level').value,
    order: parseInt(document.getElementById('sp-order').value, 10) || 0,
  };
  if (!payload.name) { setSponsorFormMsg('Name is required.', 'error'); return; }

  const isEdit = Boolean(id);
  const apiUrl = isEdit ? `/api/sponsors/${id}` : '/api/sponsors';
  sponsorSubmit.disabled = true;
  setSponsorFormMsg('');
  try {
    const res = await fetch(apiUrl, {
      method:  isEdit ? 'PUT' : 'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error();
    setSponsorFormMsg(isEdit ? 'Sponsor updated.' : 'Sponsor added.', 'success');
    resetSponsorForm();
    await loadSponsors();
  } catch {
    setSponsorFormMsg('Save failed. Please try again.', 'error');
  } finally {
    sponsorSubmit.disabled = false;
  }
});

function editSponsor(id) {
  const s = allSponsors.find(x => x.id === id);
  if (!s) return;
  document.getElementById('sp-edit-id').value = s.id;
  document.getElementById('sp-name').value    = s.name;
  document.getElementById('sp-url').value     = s.url || '';
  document.getElementById('sp-level').value   = s.level || 'patron';
  document.getElementById('sp-order').value   = s.order ?? 0;
  sponsorFormTitle.innerHTML = 'Edit <em>Sponsor</em>';
  sponsorSubmit.textContent  = 'Save Changes';
  sponsorCancelBtn.style.display = 'inline-block';
  setSponsorFormMsg('');
  sponsorForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

sponsorCancelBtn.addEventListener('click', resetSponsorForm);

function resetSponsorForm() {
  sponsorForm.reset();
  document.getElementById('sp-edit-id').value = '';
  document.getElementById('sp-level').value   = 'patron';
  sponsorFormTitle.innerHTML = 'Add <em>Sponsor</em>';
  sponsorSubmit.textContent  = 'Add Sponsor';
  sponsorCancelBtn.style.display = 'none';
  setSponsorFormMsg('');
}

function setSponsorFormMsg(msg, type = '') {
  if (!msg) { sponsorFormMsg.textContent = ''; sponsorFormMsg.className = 'form-msg'; return; }
  sponsorFormMsg.textContent = msg;
  sponsorFormMsg.className   = `form-msg alert alert-${type}`;
}

// confirmDeleteSponsor is defined in modal.js and dispatches via pendingDeleteType = 'sponsor'
