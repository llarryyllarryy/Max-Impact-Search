/*!
 * visitor-counter.js — counts a visit via counter.php and (optionally) shows the number.
 *
 * Include it in the page:
 *   <script src="visitor-counter.js" defer
 *           data-endpoint="https://maximpactsearch.page.gd/counter.php"></script>
 *
 * How it works
 *   1. A hidden 1x1 iframe loads  counter.php?count=1  -> counts this visit.
 *      (An iframe is a real page navigation, so the host's browser check can run;
 *       fetch / sendBeacon / <script> requests can't pass it.)
 *   2. With ?visitor in the page URL, a badge "👀 Visitor #N" appears. N is shown by a
 *      second, visible iframe that loads  counter.php  (no count param), which only
 *      displays the current number and never counts.
 *   Blockers may stop the hidden iframe; those visits are not counted.
 *
 * Optional attributes on the <script> tag
 *   data-endpoint     URL of counter.php           (default below)
 *   data-badge-param  query parameter that shows the badge   (default "visitor")
 */
(function () {
  'use strict';
  if (window.__visitorCounterStarted) return;      // never count twice per page load
  window.__visitorCounterStarted = true;

  const script = document.currentScript;
  const opt = (name, fallback) => (script && script.dataset && script.dataset[name]) || fallback;

  const ENDPOINT    = opt('endpoint', 'https://maximpactsearch.page.gd/counter.php');
  const BADGE_PARAM = opt('badgeParam', 'visitor');
  const showBadgeRequested = new URLSearchParams(window.location.search).has(BADGE_PARAM);

  // counter.php?count=1 counts a visit; counter.php without it only displays the number.
  function endpointUrl(count) {
    const sep = ENDPOINT.indexOf('?') === -1 ? '?' : '&';
    return ENDPOINT + sep + (count ? 'count=1&' : '') + '_=' + Date.now();   // _ = cache-buster
  }

  function makeFrame(src, visible) {
    const f = document.createElement('iframe');
    f.src = src;
    f.title = 'visitor counter';
    f.setAttribute('aria-hidden', 'true');
    f.setAttribute('tabindex', '-1');
    f.loading = 'eager';
    f.referrerPolicy = 'no-referrer';
    if (!visible) {
      // 1x1 + opacity 0 (not 0x0 / display:none) so browsers still load it
      f.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    }
    return f;
  }

  function injectStyles() {
    if (document.getElementById('visitor-counter-style')) return;
    const css = document.createElement('style');
    css.id = 'visitor-counter-style';
    css.textContent =
      '#visitor-counter{position:fixed;top:76px;right:16px;z-index:150;display:flex;align-items:center;gap:4px;' +
      'background:var(--paper,#fff);color:var(--ink-soft,#5a6b60);border:1px solid var(--line,#ddd);' +
      'padding:6px 14px;border-radius:100px;font-size:.76rem;font-family:"Space Mono",monospace;' +
      'box-shadow:0 8px 18px rgba(0,0,0,.1);opacity:0;transform:translateY(-8px);' +
      'transition:opacity .4s ease,transform .4s ease}' +
      '#visitor-counter.show{opacity:1;transform:translateY(0)}' +
      '#visitor-counter iframe{border:none;background:transparent;width:56px;height:16px;overflow:hidden;vertical-align:middle}';
    document.head.appendChild(css);
  }

  function showBadge() {
    injectStyles();
    const badge = document.createElement('div');
    badge.id = 'visitor-counter';
    badge.append('👀 Visitor #');
    badge.appendChild(makeFrame(endpointUrl(false), true));
    document.body.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add('show'));
  }

  function start() {
    const countFrame = makeFrame(endpointUrl(true), false);
    if (showBadgeRequested) {
      // show the number only after the counting request has finished
      let shown = false;
      const go = () => { if (!shown) { shown = true; showBadge(); } };
      countFrame.addEventListener('load', go);
      setTimeout(go, 4000);                       // fallback if load never fires
    }
    document.body.appendChild(countFrame);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
