// ── Events loader ─────────────────────────────────────────────────────────────
// Fetches events from /api/events and renders upcoming + past lists.
// Exposes window._eventsReady (Promise) so nav.js can await it before scrolling.
// Requires: utils.js (escHtml, MONTHS)

function eventHTML(event) {
  const [year, mm, dd] = (event.date || '').split('-');
  const month     = MONTHS[parseInt(mm, 10) - 1] || '';
  const day       = parseInt(dd, 10) || '';
  const typeLabel = [event.type, year].filter(Boolean).join(' \u00b7 ');
  const meta      = [event.time, event.location].filter(Boolean).join(' \u00b7 ');
  const action    = event.url
    ? `<a href="${escHtml(event.url)}" target="_blank" rel="noopener" class="event-action">${escHtml(event.urlLabel || 'View Details')}</a>`
    : '';
  return `<div class="event-item">
    <div class="event-date-box">
      <div class="event-month">${month}</div>
      <div class="event-day">${day}</div>
    </div>
    <div>
      ${typeLabel ? `<div class="event-type">${escHtml(typeLabel)}</div>` : ''}
      <div class="event-name">${escHtml(event.name)}</div>
      ${meta ? `<div class="event-meta">${escHtml(meta)}</div>` : ''}
    </div>
    ${action}
  </div>`;
}

function renderEvents(events) {
  const upcomingEl = document.getElementById('events-upcoming');
  const pastWrapEl = document.getElementById('events-past-wrap');
  const pastEl     = document.getElementById('events-past');
  const moreNote   = document.getElementById('events-more-note');
  const today      = new Date().toISOString().slice(0, 10);

  const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past     = events.filter(e => e.date <  today).sort((a, b) => b.date.localeCompare(a.date));

  if (upcoming.length) {
    upcomingEl.innerHTML = upcoming.map(eventHTML).join('');
    moreNote.style.display = 'none';
    upcomingEl.querySelectorAll('.event-item').forEach(el => el.classList.add('visible'));
  } else {
    upcomingEl.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:1.5rem 0;">No upcoming events scheduled — check back soon!</p>';
  }

  if (past.length) {
    pastEl.innerHTML = past.map(eventHTML).join('');
    pastWrapEl.style.display = 'block';
    pastEl.querySelectorAll('.event-item').forEach(el => {
      el.classList.add('visible');
      el.style.opacity = '.6';
    });
  }
}

window._eventsReady = fetch('/api/events')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(renderEvents)
  .catch(() => {
    const upcomingEl = document.getElementById('events-upcoming');
    upcomingEl.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:1.5rem 0;">Unable to load events right now. Check our <a href="https://www.zeffy.com/en-US/organizations/chelan-high-school-performing-arts-booster" target="_blank" style="color:inherit;">Zeffy page</a> for the latest.</p>';
  });
