/**
 * Visitor counter — Google Apps Script web app.
 *
 *   GET  .../exec                         -> {"count":N}            (shows the number, does NOT count)
 *   GET  .../exec?count=1&id=<visit-id>   -> {"count":N+1}          (counts ONE visit)
 *   GET  ...&callback=fn                  -> fn({"count":N});       (JSONP, for <script> tags)
 *   POST .../exec  (e.g. navigator.sendBeacon) -> counts one visit
 *
 * The optional "id" is a random id the page makes per visit. The same id is only
 * counted once (remembered for 6 hours), so a retry can never double count.
 *
 * Setup: see the steps in the chat / README. Deploy as web app:
 *   Execute as: Me   |   Who has access: Anyone
 */

var COUNT_KEY = 'count';
var ID_TTL_SECONDS = 6 * 60 * 60;          // how long a visit id is remembered (max 21600)

/** Run this ONCE in the editor if you want to continue from an existing number. */
function setStartCount() {
  var START = 0;                           // <- put your current number here, then press Run
  PropertiesService.getScriptProperties().setProperty(COUNT_KEY, String(START));
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var total = (p.count === '1') ? increment_(p.id) : readCount_();
  return respond_(total, p.callback);
}

function doPost(e) {                       // sendBeacon / fetch POST
  var p = (e && e.parameter) || {};
  return respond_(increment_(p.id), p.callback);
}

function readCount_() {
  var raw = PropertiesService.getScriptProperties().getProperty(COUNT_KEY);
  var n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

function increment_(id) {
  var validId = (typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id)) ? id : null;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);                    // visitors at the same moment queue up, no lost counts
  try {
    var cache = CacheService.getScriptCache();
    if (validId && cache.get('v:' + validId)) return readCount_();   // already counted this visit
    var n = readCount_() + 1;
    PropertiesService.getScriptProperties().setProperty(COUNT_KEY, String(n));
    if (validId) cache.put('v:' + validId, '1', ID_TTL_SECONDS);
    return n;
  } finally {
    lock.releaseLock();
  }
}

function respond_(total, callback) {
  var json = JSON.stringify({ count: total });
  // Only a plain JavaScript function name is accepted as JSONP callback (no code injection).
  if (typeof callback === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
