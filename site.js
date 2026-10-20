/* Header compacts slightly once the page is scrolled and opens back up at the top. */
(function () {
  var header = document.querySelector('header.top');
  if (!header) return;
  var compact = false, ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    /* two thresholds so the header does not flicker at the edge */
    if (!compact && y > 48) { compact = true; header.classList.add('is-compact'); }
    else if (compact && y < 8) { compact = false; header.classList.remove('is-compact'); }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
