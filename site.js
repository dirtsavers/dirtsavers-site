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

/* Google Ads conversions: count clicks on the phone number (Call click) and on the
   plans email or Dropbox upload link (Send plans click). One listener for every page. */
(function () {
  var CALL = 'AW-18556826050/Q_svCOOIvbwdEMLjypBF';
  var PLANS = 'AW-18556826050/NUUpCJTotrwdEMLjypBF';
  document.addEventListener('click', function (e) {
    if (typeof window.gtag !== 'function') return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var sendTo = null;
    if (/^tel:/i.test(href)) sendTo = CALL;
    else if (/^mailto:plans@dirtsavers\.com/i.test(href) || /dropbox\.com\/request\//i.test(href)) sendTo = PLANS;
    if (sendTo) window.gtag('event', 'conversion', { send_to: sendTo, value: 1.0, currency: 'USD' });
  }, true);
})();
