// ── Delete confirm modal ──────────────────────────────────────────────────────
// Requires: auth.js (authHeaders, handleUnauthorized)
// Requires: events.js (allEvents, loadEvents, editIdField, resetForm)
// Requires: board.js  (allMembers, loadBoard, boardEditId, resetBoardForm)

let pendingDeleteId   = null;
let pendingDeleteType = null; // 'event' | 'member'

const deleteModal      = document.getElementById('delete-modal');
const deleteModalTitle = document.getElementById('delete-modal-title');
const deleteBody       = document.getElementById('delete-modal-body');
const deleteCancelBtn  = document.getElementById('delete-cancel-btn');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

function confirmDelete(id, name) {
  pendingDeleteId   = id;
  pendingDeleteType = 'event';
  deleteModalTitle.textContent = 'Delete Event?';
  deleteBody.textContent       = `Delete "${name}"? This cannot be undone.`;
  deleteModal.classList.add('open');
}

function confirmDeleteMember(id, name) {
  pendingDeleteId   = id;
  pendingDeleteType = 'member';
  deleteModalTitle.textContent = 'Delete Board Member?';
  deleteBody.textContent       = `Delete "${name}"? This cannot be undone.`;
  deleteModal.classList.add('open');
}

deleteConfirmBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  deleteConfirmBtn.disabled = true;
  const endpoint = pendingDeleteType === 'member'
    ? `/api/board/${pendingDeleteId}`
    : `/api/events/${pendingDeleteId}`;
  try {
    const res = await fetch(endpoint, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { handleUnauthorized(); return; }
    deleteModal.classList.remove('open');
    if (pendingDeleteType === 'member') {
      if (boardEditId.value === pendingDeleteId) resetBoardForm();
      await loadBoard();
    } else {
      if (editIdField.value === pendingDeleteId) resetForm();
      await loadEvents();
    }
    pendingDeleteId   = null;
    pendingDeleteType = null;
  } catch {
    deleteModal.classList.remove('open');
  } finally {
    deleteConfirmBtn.disabled = false;
  }
});

deleteCancelBtn.addEventListener('click', () => {
  deleteModal.classList.remove('open');
  pendingDeleteId   = null;
  pendingDeleteType = null;
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove('open');
    pendingDeleteId   = null;
    pendingDeleteType = null;
  }
});
