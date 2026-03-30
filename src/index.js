/**
 * Chelan PA Booster – Cloudflare Worker
 *
 * Routes:
 *   GET  /api/events            – public list of all events
 *   GET  /api/board             – public list of board members
 *   POST /api/admin/login       – validate admin password
 *   POST /api/events            – create event  (requires auth)
 *   PUT  /api/events/:id        – update event  (requires auth)
 *   DELETE /api/events/:id      – delete event  (requires auth)
 *   POST /api/board             – create board member  (requires auth)
 *   PUT  /api/board/:id         – update board member  (requires auth)
 *   DELETE /api/board/:id       – delete board member  (requires auth)
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

// Routes that map to index.html (single-page app with clean URLs)
const PAGE_ROUTES = new Set(['/mission', '/what-we-do', '/who-we-are', '/events', '/about']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // Serve index.html for known page routes (clean URLs)
    if (PAGE_ROUTES.has(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
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

  return jsonResponse({ error: 'Not found' }, 404);
}
