// ── Events CRUD ───────────────────────────────────────────────────────────────
// Requires: utils.js (escHtml, escAttr, MONTHS), auth.js (authHeaders, handleUnauthorized)

let allEvents = [];

const eventForm      = document.getElementById('event-form');
const formCardTitle  = document.getElementById('form-card-title');
const formSubmit     = document.getElementById('form-submit-btn');
const formCancel     = document.getElementById('form-cancel-btn');
const formMsg        = document.getElementById('form-msg');
const editIdField    = document.getElementById('edit-id');
const eventsLoading  = document.getElementById('events-loading');
const eventsList     = document.getElementById('events-list');
const upcomingList   = document.getElementById('upcoming-list');
const pastList       = document.getElementById('past-list');

async function loadEvents() {
  eventsLoading.style.display = 'block';
  eventsList.style.display = 'none';
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('Failed to load');
    allEvents = await res.json();
    renderAdminEvents();
  } catch {
    eventsLoading.textContent = 'Failed to load events.';
  }
}

function renderAdminEvents() {
  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = allEvents.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past     = allEvents.filter(e => e.date <  today).sort((a, b) => b.date.localeCompare(a.date));

  upcomingList.innerHTML = upcoming.length
    ? upcoming.map(eventRowHTML).join('')
    : '<div class="empty-state">No upcoming events.</div>';
  pastList.innerHTML = past.length
    ? past.map(e => eventRowHTML(e, true)).join('')
    : '<div class="empty-state">No past events.</div>';

  eventsLoading.style.display = 'none';
  eventsList.style.display = 'block';
}

function eventRowHTML(event, isPast = false) {
  const [year, monthIdx, day] = (event.date || '').split('-');
  const month   = MONTHS[parseInt(monthIdx, 10) - 1] || '';
  const meta    = [event.time, event.location].filter(Boolean).join(' · ');
  const typeYear = [event.type, year].filter(Boolean).join(' · ');
  return `
    <div class="event-row${isPast ? ' past-event' : ''}">
      <div class="event-row-date">
        <div class="event-row-month">${month}</div>
        <div class="event-row-day">${parseInt(day, 10)}</div>
      </div>
      <div>
        ${typeYear ? `<div style="font-size:.65rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-dim);margin-bottom:.2rem;">${escHtml(typeYear)}</div>` : ''}
        <div class="event-row-name">${escHtml(event.name)}</div>
        ${meta ? `<div class="event-row-meta">${escHtml(meta)}</div>` : ''}
      </div>
      <div class="event-row-actions">
        <button class="btn btn-outline btn-sm" onclick="startEdit('${event.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('${event.id}', '${escAttr(event.name)}')">Delete</button>
      </div>
    </div>`;
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editIdField.value;
  const payload = {
    name:     document.getElementById('f-name').value.trim(),
    type:     document.getElementById('f-type').value.trim(),
    date:     document.getElementById('f-date').value,
    time:     document.getElementById('f-time').value.trim(),
    location: document.getElementById('f-location').value.trim(),
    url:      document.getElementById('f-url').value.trim(),
    urlLabel: document.getElementById('f-url-label').value.trim() || 'View Details',
  };
  if (!payload.name || !payload.date) {
    setFormMsg('Event name and date are required.', 'error');
    return;
  }
  formSubmit.disabled = true;
  setFormMsg('');
  try {
    const res = await fetch(id ? `/api/events/${id}` : '/api/events', {
      method:  id ? 'PUT' : 'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error('Save failed');
    setFormMsg(id ? 'Event updated.' : 'Event added.', 'success');
    resetForm();
    await loadEvents();
  } catch {
    setFormMsg('Save failed. Please try again.', 'error');
  } finally {
    formSubmit.disabled = false;
  }
});

formCancel.addEventListener('click', resetForm);

function startEdit(id) {
  const event = allEvents.find(e => e.id === id);
  if (!event) return;
  editIdField.value = id;
  document.getElementById('f-name').value     = event.name     || '';
  document.getElementById('f-type').value     = event.type     || '';
  document.getElementById('f-date').value     = event.date     || '';
  document.getElementById('f-time').value     = event.time     || '';
  document.getElementById('f-location').value = event.location || '';
  document.getElementById('f-url').value      = event.url      || '';
  document.getElementById('f-url-label').value= event.urlLabel || 'View Details';
  formCardTitle.innerHTML = 'Edit <em>Event</em>';
  formSubmit.textContent  = 'Save Changes';
  formCancel.style.display = 'inline-block';
  setFormMsg('');
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  editIdField.value = '';
  eventForm.reset();
  formCardTitle.innerHTML  = 'Add <em>New Event</em>';
  formSubmit.textContent   = 'Add Event';
  formCancel.style.display = 'none';
  setFormMsg('');
}

function setFormMsg(msg, type = '') {
  if (!msg) { formMsg.textContent = ''; formMsg.className = 'form-msg'; return; }
  formMsg.textContent = msg;
  formMsg.className   = `form-msg alert alert-${type}`;
}
