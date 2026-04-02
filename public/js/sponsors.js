// ── Sponsor ticker ────────────────────────────────────────────────────────────
// Fetches sponsors from the API and populates the scrolling ticker.
// Hides the ticker entirely if visible === false or no sponsors exist.

(function () {
  const TIER_RANK  = { producer: 0, spotlight: 1, artist: 2, patron: 3 };
  const TIER_LABEL = { producer: 'Producer', spotlight: 'Spotlight', artist: 'Artist', patron: 'Patron' };

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildTrack(items) {
    // Repeat enough times so one set is wider than any viewport, then duplicate for the seamless loop
    const reps = Math.ceil(10 / items.length);
    const set  = Array.from({ length: reps }, () => items).flat();
    const both = [...set, ...set];
    return both.map((s) => {
      const tierBadge = s.level
        ? `<span class="sponsor-tier">${TIER_LABEL[s.level] ?? s.level}</span>`
        : '';
      const content = `${escHtml(s.name)}${tierBadge}`;
      return s.url
        ? `<a class="sponsor-item" href="${escHtml(s.url)}" target="_blank" rel="noopener">${content}</a>`
        : `<span class="sponsor-item">${content}</span>`;
    }).join('');
  }

  fetch('/api/sponsors')
    .then(r => r.json())
    .then(({ visible, items }) => {
      const ticker = document.getElementById('sponsor-ticker');
      if (!ticker) return;

      const sorted = (items || []).slice().sort((a, b) => {
        const rankDiff = (TIER_RANK[a.level] ?? 99) - (TIER_RANK[b.level] ?? 99);
        return rankDiff !== 0 ? rankDiff : (a.order ?? 0) - (b.order ?? 0);
      });

      if (!visible || !sorted.length) {
        ticker.style.display = 'none';
        const hero = document.querySelector('.hero');
        if (hero) hero.style.paddingTop = '';
        return;
      }

      const track = ticker.querySelector('.sponsor-track');
      if (track) track.innerHTML = buildTrack(sorted);
    })
    .catch(() => {
      const ticker = document.getElementById('sponsor-ticker');
      if (ticker) ticker.style.display = 'none';
    });
})();
