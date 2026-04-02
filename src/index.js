/**
 * Chelan PA Booster – Cloudflare Worker
 *
 * Routes:
 *   GET  /api/events            – public list of all events
 *   GET  /api/board             – public list of board members
 *   GET  /api/gallery           – public list of gallery photos
 *   GET  /api/sponsors          – public sponsors list + visibility flag
 *   POST /api/admin/login       – validate admin password
 *   POST /api/events            – create event  (requires auth)
 *   PUT  /api/events/:id        – update event  (requires auth)
 *   DELETE /api/events/:id      – delete event  (requires auth)
 *   POST /api/board             – create board member  (requires auth)
 *   PUT  /api/board/:id         – update board member  (requires auth)
 *   DELETE /api/board/:id       – delete board member  (requires auth)
 *   POST /api/gallery           – upload photo  (requires auth)
 *   PUT  /api/gallery/:id       – update caption/order  (requires auth)
 *   DELETE /api/gallery/:id     – delete photo  (requires auth)
 *   PUT /api/sponsors/settings  – toggle banner visibility  (requires auth)
 *   POST /api/sponsors          – create sponsor  (requires auth)
 *   PUT  /api/sponsors/:id      – update sponsor  (requires auth)
 *   DELETE /api/sponsors/:id    – delete sponsor  (requires auth)
 *   *                           – serve static assets
 *
 * Required environment:
 *   ADMIN_PASSWORD  (Cloudflare secret)  – admin login password
 *   EVENTS_KV       (KV binding)         – event + board storage
 *   ASSETS          (Assets binding)     – static file serving
 */

// Default seed event so the site looks populated before any events are added.
const SEED_EVENTS = [
  {
    id: 'seed-night-of-jazz',
    name: 'Night of Jazz',
    type: 'Fundraiser',
    date: '2026-03-08',
    time: '6:00 \u2013 8:00 PM',
    location: '215 Webster Ave, Chelan, WA',
    url: 'https://www.zeffy.com/en-US/organizations/chelan-high-school-performing-arts-booster',
    urlLabel: 'View Details',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // Serve static assets (index.html, admin.html, images, etc.)
    return env.ASSETS.fetch(request);
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function isAuthorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === env.ADMIN_PASSWORD;
}

// ── Events ───────────────────────────────────────────────────────────────────

async function getEvents(env) {
  const raw = await env.EVENTS_KV.get('events');
  if (!raw) return [...SEED_EVENTS];
  try {
    return JSON.parse(raw);
  } catch {
    return [...SEED_EVENTS];
  }
}

async function saveEvents(env, events) {
  await env.EVENTS_KV.put('events', JSON.stringify(events));
}

function sanitizeEvent(body, existing = {}) {
  return {
    ...existing,
    name:     String(body.name     ?? existing.name     ?? '').trim(),
    type:     String(body.type     ?? existing.type     ?? '').trim(),
    date:     String(body.date     ?? existing.date     ?? '').trim(),
    time:     String(body.time     ?? existing.time     ?? '').trim(),
    location: String(body.location ?? existing.location ?? '').trim(),
    url:      String(body.url      ?? existing.url      ?? '').trim(),
    urlLabel: String(body.urlLabel ?? existing.urlLabel ?? 'View Details').trim(),
  };
}

// ── Board Members ─────────────────────────────────────────────────────────────

async function getBoard(env) {
  const raw = await env.EVENTS_KV.get('board');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveBoard(env, members) {
  await env.EVENTS_KV.put('board', JSON.stringify(members));
}

function sanitizeMember(body, existing = {}) {
  return {
    ...existing,
    name:  String(body.name  ?? existing.name  ?? '').trim(),
    role:  String(body.role  ?? existing.role  ?? '').trim(),
    bio:   String(body.bio   ?? existing.bio   ?? '').trim(),
    image: String(body.image ?? existing.image ?? '').trim(),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : (existing.order ?? 0),
  };
}

// ── Gallery ───────────────────────────────────────────────────────────────────

async function getGallery(env) {
  const raw = await env.EVENTS_KV.get('gallery');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveGallery(env, photos) {
  await env.EVENTS_KV.put('gallery', JSON.stringify(photos));
}

function sanitizePhoto(body, existing = {}) {
  return {
    ...existing,
    caption: String(body.caption ?? existing.caption ?? '').trim(),
    image:   String(body.image   ?? existing.image   ?? '').trim(),
    order:   Number.isFinite(Number(body.order)) ? Number(body.order) : (existing.order ?? 0),
  };
}

// ── Sponsors ──────────────────────────────────────────────────────────────────

async function getSponsors(env) {
  const raw = await env.EVENTS_KV.get('sponsors');
  if (!raw) return { visible: true, items: [] };
  try { return JSON.parse(raw); } catch { return { visible: true, items: [] }; }
}

async function saveSponsors(env, data) {
  await env.EVENTS_KV.put('sponsors', JSON.stringify(data));
}

const SPONSOR_LEVELS = ['patron', 'artist', 'spotlight', 'producer'];

function sanitizeSponsor(body, existing = {}) {
  const level = SPONSOR_LEVELS.includes(body.level) ? body.level
    : SPONSOR_LEVELS.includes(existing.level) ? existing.level
    : 'patron';
  return {
    ...existing,
    name:  String(body.name  ?? existing.name  ?? '').trim(),
    url:   String(body.url   ?? existing.url   ?? '').trim(),
    level,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : (existing.order ?? 0),
  };
}

// ── API Router ────────────────────────────────────────────────────────────────

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // ── Public: GET /api/events ──────────────────────────────
  if (url.pathname === '/api/events' && request.method === 'GET') {
    const events = await getEvents(env);
    return jsonResponse(events);
  }

  // ── Public: GET /api/board ───────────────────────────────
  if (url.pathname === '/api/board' && request.method === 'GET') {
    const members = await getBoard(env);
    return jsonResponse(members);
  }

  // ── Public: GET /api/gallery ─────────────────────────────
  if (url.pathname === '/api/gallery' && request.method === 'GET') {
    const photos = await getGallery(env);
    return jsonResponse(photos);
  }

  // ── Public: GET /api/sponsors ────────────────────────────
  if (url.pathname === '/api/sponsors' && request.method === 'GET') {
    return jsonResponse(await getSponsors(env));
  }

  // ── Public: POST /api/admin/login ───────────────────────
  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!env.ADMIN_PASSWORD) {
      return jsonResponse({ error: 'Admin not configured. Set ADMIN_PASSWORD secret.' }, 503);
    }
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    if (body.password === env.ADMIN_PASSWORD) {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: 'Invalid password' }, 401);
  }

  // ── Protected routes (require auth) ─────────────────────
  if (!isAuthorized(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // POST /api/events – create
  if (url.pathname === '/api/events' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    if (!body.name || !body.date) {
      return jsonResponse({ error: 'name and date are required' }, 400);
    }
    const events = await getEvents(env);
    const event = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...sanitizeEvent(body),
    };
    events.push(event);
    await saveEvents(env, events);
    return jsonResponse(event, 201);
  }

  // Match /api/events/:id
  const eventIdMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);

  // PUT /api/events/:id – update
  if (eventIdMatch && request.method === 'PUT') {
    const id = eventIdMatch[1];
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const events = await getEvents(env);
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
    events[idx] = { ...events[idx], ...sanitizeEvent(body, events[idx]) };
    await saveEvents(env, events);
    return jsonResponse(events[idx]);
  }

  // DELETE /api/events/:id
  if (eventIdMatch && request.method === 'DELETE') {
    const id = eventIdMatch[1];
    const events = await getEvents(env);
    const filtered = events.filter(e => e.id !== id);
    if (filtered.length === events.length) {
      return jsonResponse({ error: 'Not found' }, 404);
    }
    await saveEvents(env, filtered);
    return jsonResponse({ ok: true });
  }

  // POST /api/board – create board member
  if (url.pathname === '/api/board' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    if (!body.name || !body.role) {
      return jsonResponse({ error: 'name and role are required' }, 400);
    }
    const members = await getBoard(env);
    const member = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...sanitizeMember(body),
    };
    members.push(member);
    await saveBoard(env, members);
    return jsonResponse(member, 201);
  }

  // Match /api/board/:id
  const boardIdMatch = url.pathname.match(/^\/api\/board\/([^/]+)$/);

  // PUT /api/board/:id – update
  if (boardIdMatch && request.method === 'PUT') {
    const id = boardIdMatch[1];
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const members = await getBoard(env);
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
    members[idx] = { ...members[idx], ...sanitizeMember(body, members[idx]) };
    await saveBoard(env, members);
    return jsonResponse(members[idx]);
  }

  // DELETE /api/board/:id
  if (boardIdMatch && request.method === 'DELETE') {
    const id = boardIdMatch[1];
    const members = await getBoard(env);
    const filtered = members.filter(m => m.id !== id);
    if (filtered.length === members.length) {
      return jsonResponse({ error: 'Not found' }, 404);
    }
    await saveBoard(env, filtered);
    return jsonResponse({ ok: true });
  }

  // POST /api/gallery – upload photo
  if (url.pathname === '/api/gallery' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    if (!body.image) {
      return jsonResponse({ error: 'image is required' }, 400);
    }
    const photos = await getGallery(env);
    const photo = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...sanitizePhoto(body),
    };
    photos.push(photo);
    await saveGallery(env, photos);
    return jsonResponse(photo, 201);
  }

  // Match /api/gallery/:id
  const galleryIdMatch = url.pathname.match(/^\/api\/gallery\/([^/]+)$/);

  // PUT /api/gallery/:id – update caption/order
  if (galleryIdMatch && request.method === 'PUT') {
    const id = galleryIdMatch[1];
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const photos = await getGallery(env);
    const idx = photos.findIndex(p => p.id === id);
    if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
    photos[idx] = { ...photos[idx], ...sanitizePhoto(body, photos[idx]) };
    await saveGallery(env, photos);
    return jsonResponse(photos[idx]);
  }

  // DELETE /api/gallery/:id
  if (galleryIdMatch && request.method === 'DELETE') {
    const id = galleryIdMatch[1];
    const photos = await getGallery(env);
    const filtered = photos.filter(p => p.id !== id);
    if (filtered.length === photos.length) {
      return jsonResponse({ error: 'Not found' }, 404);
    }
    await saveGallery(env, filtered);
    return jsonResponse({ ok: true });
  }

  // PUT /api/sponsors/settings – toggle banner visibility
  if (url.pathname === '/api/sponsors/settings' && request.method === 'PUT') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const data = await getSponsors(env);
    data.visible = body.visible !== false;
    await saveSponsors(env, data);
    return jsonResponse({ ok: true, visible: data.visible });
  }

  // POST /api/sponsors – create
  if (url.pathname === '/api/sponsors' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    if (!body.name) return jsonResponse({ error: 'name is required' }, 400);
    const data = await getSponsors(env);
    const sponsor = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...sanitizeSponsor(body),
    };
    data.items.push(sponsor);
    await saveSponsors(env, data);
    return jsonResponse(sponsor, 201);
  }

  // Match /api/sponsors/:id
  const sponsorIdMatch = url.pathname.match(/^\/api\/sponsors\/([^/]+)$/);

  // PUT /api/sponsors/:id – update
  if (sponsorIdMatch && request.method === 'PUT') {
    const id = sponsorIdMatch[1];
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const data = await getSponsors(env);
    const idx = data.items.findIndex(s => s.id === id);
    if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
    data.items[idx] = { ...data.items[idx], ...sanitizeSponsor(body, data.items[idx]) };
    await saveSponsors(env, data);
    return jsonResponse(data.items[idx]);
  }

  // DELETE /api/sponsors/:id
  if (sponsorIdMatch && request.method === 'DELETE') {
    const id = sponsorIdMatch[1];
    const data = await getSponsors(env);
    const filtered = data.items.filter(s => s.id !== id);
    if (filtered.length === data.items.length) return jsonResponse({ error: 'Not found' }, 404);
    data.items = filtered;
    await saveSponsors(env, data);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
