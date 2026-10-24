/*!
 * visitor-counter.js — counts a visit and (optionally) shows the number.
 *
 * Include it in the page:
 *   <script src="visitor-counter.js" defer
 *           data-endpoint="https://script.google.com/macros/s/XXXX/exec"></script>
 *
 * Two kinds of counter are supported (picked automatically from data-endpoint):
 *
 *  A) Google Apps Script web app (endpoint on script.google.com)      -> method "api"
 *     One request  .../exec?count=1&id=<random visit id>  counts the visit and returns
 *     {"count":N}. It is sent with fetch(); if that fails (blocker, CORS) the same request
 *     is repeated as a <script> tag (JSONP). The visit id makes the retry harmless: the
 *     server counts one id only once.
 *
 *  B) counter.php on a PHP host (any other endpoint)                  -> method "iframe"
 *     A hidden 1x1 iframe loads  counter.php?count=1  (a real page navigation, which is
 *     the only thing that gets past the "checking your browser" page of some free hosts).
 *
 * With ?visitor in the page URL a badge "👀 Visitor #N" is shown.
 * Blockers may stop the request; those visits are not counted.
 *
 * Optional attributes on the <script> tag
 *   data-endpoint     URL of the counter                          (default below)
 *   data-method       "api" or "iframe" (overrides the automatic choice)
 *   data-badge-param  query parameter that shows the badge        (default "visitor")
 */
(function () {
  'use strict';
  if (window.__visitorCounterStarted) return;      // never count twice per page load
  window.__visitorCounterStarted = true;

  const script = document.currentScript;
  const opt = (name, fallback) => (script && script.dataset && script.dataset[name]) || fallback;

  const ENDPOINT    = opt('endpoint', 'https://maximpactsearch.page.gd/counter.php');
  const BADGE_PARAM = opt('badgeParam', 'visitor');
  const METHOD      = opt('method', /^https:\/\/script\.google(usercontent)?\.com\//.test(ENDPOINT) ? 'api' : 'iframe');
  const showBadgeRequested = new URLSearchParams(window.location.search).has(BADGE_PARAM);

  const joiner = ENDPOINT.indexOf('?') === -1 ? '?' : '&';
  const url = (query) => ENDPOINT + joiner + query + (query ? '&' : '') + '_=' + Date.now();   // _ = cache-buster

  /* ---------- badge ---------- */
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
  function badgeWith(content) {                      // content: text or a DOM node
    injectStyles();
    const badge = document.createElement('div');
    badge.id = 'visitor-counter';
    badge.append(content);
    document.body.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add('show'));
    return badge;
  }

  /* ---------- method "api": Google Apps Script ---------- */
  function makeVisitId() {
    try {
      const a = new Uint8Array(12);
      crypto.getRandomValues(a);
      return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 24);
    }
  }
  function viaFetch(query) {
    return fetch(url(query), { cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => Number(j.count));
  }
  function viaJsonp(query) {                         // <script> tag: no CORS needed
    return new Promise((resolve, reject) => {
      const cb = '__visitorCounter' + Date.now().toString(36);
      const s = document.createElement('script');
      const done = (fn, v) => { clearTimeout(t); delete window[cb]; s.remove(); fn(v); };
      const t = setTimeout(() => done(reject, new Error('timeout')), 10000);
      window[cb] = d => done(resolve, Number(d && d.count));
      s.onerror = () => done(reject, new Error('script blocked or failed'));
      s.async = true;
      s.src = url(query + '&callback=' + cb);
      document.head.appendChild(s);
    });
  }
  function startApi() {
    const query = 'count=1&id=' + makeVisitId();   // same id on retry -> server counts it once
    viaFetch(query)
      .catch(() => viaJsonp(query))
      .then(n => {
        if (!Number.isFinite(n)) throw new Error('bad reply');
        if (showBadgeRequested) badgeWith('👀 Visitor #' + n);
      })
      .catch(err => {
        console.error('Visitor counter failed:', err && err.message ? err.message : err);
        if (showBadgeRequested) badgeWith('👀 Counter unreachable');
      });
  }

  /* ---------- method "iframe": counter.php ---------- */
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
  function startIframe() {
    const countFrame = makeFrame(url('count=1'), false);
    if (showBadgeRequested) {
      // show the number only after the counting request has finished
      let shown = false;
      const go = () => { if (!shown) { shown = true; const b = document.createElement('span'); b.append('👀 Visitor #'); b.appendChild(makeFrame(url(''), true)); badgeWith(b); } };
      countFrame.addEventListener('load', go);
      setTimeout(go, 4000);                       // fallback if load never fires
    }
    document.body.appendChild(countFrame);
  }

  function start() { (METHOD === 'api' ? startApi : startIframe)(); }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
