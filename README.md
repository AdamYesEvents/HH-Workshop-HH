# HH-Workshop-HH — Mendo HireHop plugin

Public hosting for the Mendo plugin so HireHop can load it via jsDelivr.
The main Mendo app lives in `AdamYesEvents/HH-Workshop` (private); this
repo exists only to serve `plugin.js` publicly.

## Install in HireHop

Settings → Company Settings → Plugins:

```
https://cdn.jsdelivr.net/gh/AdamYesEvents/HH-Workshop-HH@mendo-plugin-v0.1.0/plugin.js
```

Pin to a tag (never `@main`). Pointing HireHop at a floating ref would
let an unexpected push change the plugin users load.

## Rotating the shared secret

1. Mendo → Admin → Integrations → Rotate secret. Copy the value.
2. Edit `plugin.js` here, swap `PLUGIN_SECRET` for the new value.
3. Bump the `Version:` banner at the top of the file.
4. Commit, tag `mendo-plugin-v0.1.1` (etc), push.
5. Update HireHop's plugin URL to the new tag.

## What the plugin does

Injects an **Open Mendo** button in HireHop's top-right header (left of
the company name). Clicking it signs the current HH user into Mendo via
a short-lived HMAC-signed URL — no second login prompt.

Three more injection points are coming (home preset tiles, favourite
tiles, next to the Stock Check button) — currently commented out in
`plugin.js`, enabled individually once the HH DOM selectors are
confirmed.

## Pairing

- Mendo endpoint: `web/src/routes/sso/plugin/` in HH-Workshop.
- Shared secret: `AppConfig: plugin.sharedSecret` in Mendo DB; baked
  into `plugin.js` at tag time.
- HMAC: SHA-256 over `${hhUserId}:${timestamp}:${nonce}`, 60-second
  window, one-time nonce per 5 minutes.
