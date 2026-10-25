/*!
 * Mendo HireHop plugin
 * Injects "Open in Mendo" entries into HireHop's UI. Clicking any entry
 * signs the current HH user into Mendo via a short-lived HMAC-signed URL —
 * no second login prompt.
 *
 * Install (in HireHop → Settings → Company Settings → Plugins):
 *   https://cdn.jsdelivr.net/gh/AdamYesEvents/HH-Workshop-HH@mendo-plugin-v0.1.0/plugin.js
 * (Use jsDelivr, not raw.githubusercontent.com — raw refuses to execute JS.)
 *
 * Version: 0.1.0
 */

(function () {
  "use strict";

  // ============================================================
  // CONFIG — edit before tagging a release
  // ============================================================
  var MENDO_ORIGIN = "https://mendo.yes.net";
  var PLUGIN_SECRET = "n9dx6ChRydj_Bi_Vr2ho1tWKMQHFE6dCFXzQhw_MzYc";

  // ============================================================
  // HireHop boot gate — same shape as Stage Designer's loader.
  // ============================================================
  function hhReady() {
    return typeof user !== "undefined" && user &&
           typeof hh_api_version !== "undefined" && hh_api_version >= 1.3 &&
           typeof jQuery !== "undefined";
  }

  // ============================================================
  // HMAC-sign + open the SSO handoff URL on Mendo's origin.
  // ============================================================
  var enc = new TextEncoder();
  function ab2hex(buf) {
    var b = new Uint8Array(buf), out = "";
    for (var i = 0; i < b.length; i++) out += ("0" + b[i].toString(16)).slice(-2);
    return out;
  }

  async function signAndOpen(next) {
    var hhUserId = user && (user.ID || user.id);
    if (!hhUserId) { alert("Mendo plugin: couldn't read your HireHop user id."); return; }
    var timestamp = Math.floor(Date.now() / 1000);
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
    var key = await crypto.subtle.importKey(
      "raw", enc.encode(PLUGIN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    var sig = await crypto.subtle.sign("HMAC", key, enc.encode(hhUserId + ":" + timestamp + ":" + nonce));
    var qs = new URLSearchParams({
      u: String(hhUserId), t: String(timestamp), n: nonce, s: ab2hex(sig), next: next || "/"
    });
    // New tab so the user keeps their HireHop session.
    window.open(MENDO_ORIGIN + "/sso/plugin?" + qs.toString(), "_blank", "noopener");
  }

  // ============================================================
  // Injection #1 — header: Mendo badge left of "Yes Events Ltd"
  // Idempotent; safe to call every tick.
  // ============================================================
  function injectHeader($) {
    var $company = $(".hh-header-company");
    if (!$company.length) return;
    if ($company.prev(".mendo-header-cell").length) return;

    var $cell = $('<div class="mendo-header-cell" style="display:flex;align-items:center;gap:6px;font-size:13px;border-right:1px solid rgba(0,0,0,0.1);padding-right:15px;cursor:pointer">' +
      '<span class="ui-icon ui-icon-extlink" style="margin:0;transform:scale(1.2);flex-shrink:0"></span>' +
      '<span class="mendo-header-link" style="text-decoration:underline;cursor:pointer;white-space:nowrap">Open Mendo</span>' +
      '</div>');
    $cell.on("click", function (e) { e.preventDefault(); signAndOpen("/"); });
    $company.before($cell);
  }

  // ============================================================
  // Injection #2 — home screen preset-search tiles. SELECTOR TODO.
  // (Commented until the DOM snippet lands.)
  // ============================================================
  // function injectHomePresetTiles($) { /* TODO when selector arrives */ }

  // ============================================================
  // Injection #3 — home screen favourite tiles. SELECTOR TODO.
  // ============================================================
  // function injectHomeFavouriteTiles($) { /* TODO when selector arrives */ }

  // ============================================================
  // Injection #4 — next to the Stock Check button. SELECTOR TODO.
  // ============================================================
  // function injectNextToStockCheck($) { /* TODO when selector arrives */ }

  // ============================================================
  // Boot + poll loop (HH re-renders bits of the UI).
  // ============================================================
  function tick() {
    if (!hhReady()) return;
    var $ = window.jQuery;
    try { injectHeader($); } catch (e) {}
    // try { injectHomePresetTiles($); } catch (e) {}
    // try { injectHomeFavouriteTiles($); } catch (e) {}
    // try { injectNextToStockCheck($); } catch (e) {}
  }

  function boot() {
    if (!hhReady()) { setTimeout(boot, 100); return; }
    tick();
    setInterval(tick, 1000);
  }

  boot();
})();
