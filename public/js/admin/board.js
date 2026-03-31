// ── Board CRUD ────────────────────────────────────────────────────────────────
// Requires: utils.js (escHtml, escAttr), auth.js (authHeaders, handleUnauthorized)

let allMembers = [];
let pendingImageBase64 = '';

const boardForm         = document.getElementById('board-form');
const boardFormTitle    = document.getElementById('board-form-title');
const boardSubmit       = document.getElementById('board-submit-btn');
const boardCancel       = document.getElementById('board-cancel-btn');
const boardFormMsg      = document.getElementById('board-form-msg');
const boardEditId       = document.getElementById('b-edit-id');
const boardLoading      = document.getElementById('board-loading');
const boardList         = document.getElementById('board-list');
const boardImageInput   = document.getElementById('b-image');
const boardImagePreview = document.getElementById('b-image-preview');

async function loadBoard() {
  boardLoading.style.display = 'block';
  boardList.style.display = 'none';
  try {
    const res = await fetch('/api/board');
    if (!res.ok) throw new Error('Failed to load');
    allMembers = await res.json();
    renderAdminBoard();
  } catch {
    boardLoading.textContent = 'Failed to load board members.';
  }
}

function renderAdminBoard() {
  const sorted = allMembers.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  boardList.innerHTML = sorted.length
    ? sorted.map(memberRowHTML).join('')
    : '<div class="empty-state">No board members yet.</div>';
  boardLoading.style.display = 'none';
  boardList.style.display = 'block';
}

function memberRowHTML(m) {
  const thumb = m.image
    ? `<div class="member-thumb"><img src="${m.image}" alt="${escHtml(m.name)}" /></div>`
    : `<div class="member-thumb">${escHtml(initials(m.name))}</div>`;
  return `<div class="member-row">
    ${thumb}
    <div>
      <div class="member-row-name">${escHtml(m.name)}</div>
      <div class="member-row-role">${escHtml(m.role)}</div>
    </div>
    <div class="member-row-actions">
      <button class="btn btn-outline btn-sm" onclick="startEditMember('${m.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteMember('${m.id}', '${escAttr(m.name)}')">Delete</button>
    </div>
  </div>`;
}

boardImageInput.addEventListener('change', () => {
  const file = boardImageInput.files[0];
  if (!file) { pendingImageBase64 = ''; boardImagePreview.classList.remove('visible'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    pendingImageBase64 = e.target.result;
    boardImagePreview.src = pendingImageBase64;
    boardImagePreview.classList.add('visible');
  };
  reader.readAsDataURL(file);
});

boardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id             = boardEditId.value;
  const existingMember = id ? allMembers.find(m => m.id === id) : null;
  const payload = {
    name:  document.getElementById('b-name').value.trim(),
    role:  document.getElementById('b-role').value.trim(),
    bio:   document.getElementById('b-bio').value.trim(),
    order: parseInt(document.getElementById('b-order').value, 10) || 0,
    image: pendingImageBase64 || (existingMember ? existingMember.image : ''),
  };
  if (!payload.name || !payload.role) {
    setBoardFormMsg('Name and role are required.', 'error');
    return;
  }
  boardSubmit.disabled = true;
  setBoardFormMsg('');
  try {
    const res = await fetch(id ? `/api/board/${id}` : '/api/board', {
      method:  id ? 'PUT' : 'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error('Save failed');
    setBoardFormMsg(id ? 'Member updated.' : 'Member added.', 'success');
    resetBoardForm();
    await loadBoard();
  } catch {
    setBoardFormMsg('Save failed. Please try again.', 'error');
  } finally {
    boardSubmit.disabled = false;
  }
});

boardCancel.addEventListener('click', resetBoardForm);

function startEditMember(id) {
  const m = allMembers.find(m => m.id === id);
  if (!m) return;
  boardEditId.value = id;
  document.getElementById('b-name').value  = m.name  || '';
  document.getElementById('b-role').value  = m.role  || '';
  document.getElementById('b-bio').value   = m.bio   || '';
  document.getElementById('b-order').value = m.order ?? 0;
  boardImageInput.value = '';
  pendingImageBase64 = '';
  if (m.image) {
    boardImagePreview.src = m.image;
    boardImagePreview.classList.add('visible');
  } else {
    boardImagePreview.classList.remove('visible');
  }
  boardFormTitle.innerHTML  = 'Edit <em>Board Member</em>';
  boardSubmit.textContent   = 'Save Changes';
  boardCancel.style.display = 'inline-block';
  setBoardFormMsg('');
  document.getElementById('board-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelector('[data-tab="board-panel"]').click();
}

function resetBoardForm() {
  boardEditId.value = '';
  boardForm.reset();
  pendingImageBase64 = '';
  boardImagePreview.src = '';
  boardImagePreview.classList.remove('visible');
  boardFormTitle.innerHTML  = 'Add <em>Board Member</em>';
  boardSubmit.textContent   = 'Add Member';
  boardCancel.style.display = 'none';
  setBoardFormMsg('');
}

function setBoardFormMsg(msg, type = '') {
  if (!msg) { boardFormMsg.textContent = ''; boardFormMsg.className = 'form-msg'; return; }
  boardFormMsg.textContent = msg;
  boardFormMsg.className   = `form-msg alert alert-${type}`;
}
