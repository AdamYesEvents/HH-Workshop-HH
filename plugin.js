/*!
 * Mendo HireHop plugin
 * Injects "Open in Mendo" entries into HireHop's UI. Clicking any entry
 * signs the current HH user into Mendo via a short-lived HMAC-signed URL —
 * no second login prompt.
 *
 * Install (in HireHop → Settings → Company Settings → Plugins):
 *   https://cdn.jsdelivr.net/gh/AdamYesEvents/HH-Workshop-HH@mendo-plugin-v0.1.1/plugin.js
 * (Use jsDelivr, not raw.githubusercontent.com — raw refuses to execute JS.)
 *
 * Version: 0.1.1
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
  // Resolve the HH user id — defensive about field name casing
  // across HireHop instances.
  // ============================================================
  function hhUserId() {
    if (typeof user === "undefined" || !user) return null;
    return user.ID || user.USER_ID || user.id || user.USERID || null;
  }

  // ============================================================
  // HMAC-sign the SSO handoff URL.
  // ============================================================
  var enc = new TextEncoder();
  function ab2hex(buf) {
    var b = new Uint8Array(buf), out = "";
    for (var i = 0; i < b.length; i++) out += ("0" + b[i].toString(16)).slice(-2);
    return out;
  }
  async function buildSignedUrl(next) {
    var id = hhUserId();
    if (!id) throw new Error("couldn't read your HireHop user id (window.user.ID is empty)");
    var timestamp = Math.floor(Date.now() / 1000);
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
    var key = await crypto.subtle.importKey(
      "raw", enc.encode(PLUGIN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    var sig = await crypto.subtle.sign("HMAC", key, enc.encode(id + ":" + timestamp + ":" + nonce));
    var qs = new URLSearchParams({
      u: String(id), t: String(timestamp), n: nonce, s: ab2hex(sig), next: next || "/"
    });
    return MENDO_ORIGIN + "/sso/plugin?" + qs.toString();
  }

  // ============================================================
  // Click handler. Open a popup SYNCHRONOUSLY in the same tick as the
  // click (keeps the user-gesture alive, so Chrome won't block it),
  // then set its location once the HMAC resolves. Async operations
  // between click and window.open always trip popup blockers.
  // ============================================================
  function onClick(e) {
    if (e && e.preventDefault) e.preventDefault();
    var popup = window.open("about:blank", "_blank"); // DO NOT use "noopener" — we need to redirect the popup
    buildSignedUrl("/").then(function (url) {
      try { console.log("[mendo-plugin] opening", url.slice(0, 80) + "…"); } catch (_) {}
      if (popup) popup.location.href = url;
      else window.location.href = url; // fallback if popup blocked
    }).catch(function (err) {
      try { console.error("[mendo-plugin]", err && err.message); } catch (_) {}
      if (popup) popup.close();
      alert("Mendo plugin: " + (err && err.message ? err.message : "failed to build sign-in link"));
    });
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
    $cell.on("click", onClick);
    $company.before($cell);
  }

  // ============================================================
  // Boot + poll loop (HH re-renders bits of the UI).
  // ============================================================
  function tick() {
    if (!hhReady()) return;
    var $ = window.jQuery;
    try { injectHeader($); } catch (e) {}
  }

  function boot() {
    if (!hhReady()) { setTimeout(boot, 100); return; }
    tick();
    setInterval(tick, 1000);
  }

  boot();
})();
