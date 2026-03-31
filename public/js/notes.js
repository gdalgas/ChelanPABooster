// ── Floating music notes ──────────────────────────────────────────────────────
// Spawns musical note characters that drift upward and fade in the hero section.

(function () {
  const NOTES     = ['♩', '♪', '♫', '♬'];
  const container = document.getElementById('notes-container');
  if (!container) return;

  function spawnNote() {
    const el  = document.createElement('span');
    el.className   = 'music-note';
    el.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];

    const size = 12 + Math.random() * 20;   // 12–32 px
    const left = 4  + Math.random() * 92;   // 4–96 % from left
    const top  = 25 + Math.random() * 55;   // start in the middle–lower 55 %
    const dur  = 6  + Math.random() * 6;    // 6–12 s

    el.style.cssText =
      `left:${left}%;top:${top}%;font-size:${size}px;animation-duration:${dur}s`;

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // Stagger a handful on load so the hero isn't bare for the first interval
  [0, 600, 1200, 1900, 2600].forEach(delay => setTimeout(spawnNote, delay));

  // Then keep spawning at a gentle cadence
  setInterval(spawnNote, 1100);
})();
