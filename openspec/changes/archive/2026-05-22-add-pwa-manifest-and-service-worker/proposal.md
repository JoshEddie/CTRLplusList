## Why

Ctrl+List's audience opens the app on phones at gift-buying moments and would benefit from a home-screen icon and a standalone window (no browser chrome) so the experience feels app-like, not tab-like. Today the app ships Apple PWA meta tags in `app/layout.tsx` and a partial icon set under `public/`, but lacks the two artifacts modern browsers require to treat it as installable: a Web App Manifest and a registered service worker. Adding both unblocks Android's install prompt, iOS's "Add to Home Screen" with proper colors and name, and lays groundwork for a future opt-in push notifications change without committing to that scope now.

No existing spec governs the root document, icon set, or service-worker layer (verified by grepping every active spec.md under `openspec/specs/`). The closest neighbor is `app-frame`, which governs `app/(main)/layout.tsx` and CSS tokens — this change touches the root `app/layout.tsx` and adds new top-level `app/manifest.ts` / `app/sw.ts` files, with no behavior overlap.

## What Changes

- Add a Next.js manifest file at `app/manifest.ts` (Next's file convention; Next auto-injects `<link rel="manifest">`) declaring app name, icons, `display: 'standalone'`, `theme_color: '#25194e'` (the `--page-frame-gradient` start), and `background_color` matching the page background.
- Install `@serwist/next` and `@serwist/sw` (Serwist 9.5.x; peer-dep `next: >=14.0.0` confirmed against Next 16.2).
- Add `app/sw.ts` as the Serwist entry that **precaches Next-emitted build assets only** (JS chunks, CSS, fonts via `self.__SW_MANIFEST`) plus the public icon files. **No HTML route caching** — all navigations remain network-only so authenticated, viewer-scoped pages (lists, items, purchases) cannot be served from a stale cache to a different signed-in user.
- Wrap `next.config.ts` with `withSerwist({ swSrc, swDest })`.
- Add a small `"use client"` SW registration component mounted from `app/layout.tsx` (Serwist provides `<ServiceWorkerRegistration />` or equivalent).
- Add maskable icon set to `public/icons/` from the supplied `appstore-images/` source; consolidate the existing root-level `android-chrome-*.png` / `apple-touch-icon.png` into the same folder (or keep root copies for back-compat with Apple's auto-discovery — to be settled in design.md).
- Add a kill-switch path: SW that, on activation, can `self.registration.unregister()` + `caches.delete(...)` to ship an SW update that disables PWA caching cleanly if anything misbehaves in production.
- **Explicitly NOT in this change:** HTML route caching, offline fallback pages, Web Push / VAPID / subscription DB schema, in-app install-prompt UI, push-permission toggles. These are deferred to a follow-up change.

## Capabilities

### New Capabilities

- `pwa-shell`: Web App Manifest contents and service-worker scope/registration for installability. Defines (a) what the manifest declares, (b) the precache contract (assets only, never authenticated HTML), (c) the SW lifecycle and kill-switch invariant.

### Modified Capabilities

_None._ The change touches `app/layout.tsx` (root layout) only to mount the SW registration component; root layout meta is not governed by an active spec. `app-frame` governs `app/(main)/layout.tsx` and is untouched.

## Impact

- **New deps:** `@serwist/next`, `@serwist/sw` (and transitive `@serwist/cli` via peer). One-time bundle cost is at the service-worker layer, not the app bundle.
- **New files:** `app/manifest.ts`, `app/sw.ts`, `public/icons/*`, a client SW-registration component.
- **Modified files:** `next.config.ts` (wrap with `withSerwist`), `app/layout.tsx` (mount registration, possibly remove now-redundant Apple meta that the manifest covers — to be decided in design.md per overlap rules), `.gitignore` (ignore `public/sw.js*` build output if Serwist emits there), `package.json`.
- **No DB / cache-tag impact:** No new server reads, no new mutations, no `revalidateTag` paths. The service worker is a client-side concern; the existing `'use cache'` + `cacheTag` discipline in `lib/dal.ts` is untouched and protected by the no-HTML-caching rule above.
- **Production risk:** A misbehaving SW can persistently break a site for users who already registered it. Mitigation: ship the kill-switch path in the initial SW so a follow-up deploy can unregister it remotely.
- **Build / CI:** `next build` will produce an additional `public/sw.js` artifact via Serwist. The pre-merge `npm run build` gate covers this.
