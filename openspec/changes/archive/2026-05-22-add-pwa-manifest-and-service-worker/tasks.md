## 1. Compatibility spike

- [x] 1.1 Install `@serwist/next` (runtime) and `serwist` (devDep) at their current stable majors (Serwist 9.5.x); record installed versions in this task line. — installed `@serwist/next@^9.5.11`, `serwist@^9.5.11`.
- [x] 1.2 Wrap `next.config.ts` with a minimal `withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js', disable: process.env.NODE_ENV === 'development' })` and create a stub `app/sw.ts` (empty `Serwist` instantiation with `precacheEntries: self.__SW_MANIFEST` and no runtime caching).
- [x] 1.3 Run `npm run build` and confirm it completes, that `public/sw.js` is emitted, and that the build does not warn about peer-dep mismatches against Next 16.2. **APPLY-TIME PIVOT (see design.md R1):** Initial build failed with Next 16 Turbopack vs. Serwist webpack-config conflict. Resolved by (a) changing `build` script to `next build --webpack`, (b) short-circuiting `withSerwist` entirely in dev so `next dev --turbopack` is undisturbed. `public/sw.js` (38 KB) now emits cleanly on prod builds.

## 2. Icons in `public/`

- [x] 2.1 Create `public/icons/` directory.
- [x] 2.2 Copy `~/Downloads/appstore-images/android/launchericon-192x192.png` to `public/icons/icon-192.png`.
- [x] 2.3 Copy `~/Downloads/appstore-images/android/launchericon-512x512.png` to `public/icons/icon-512.png`.
- [x] 2.4 Replace `public/apple-touch-icon.png` with `~/Downloads/appstore-images/ios/180.png` (180×180 is the size iOS requests; confirm via `file public/apple-touch-icon.png` after copy). — confirmed 180×180 RGBA PNG.
- [x] 2.5 Do NOT delete existing `public/android-chrome-192x192.png` or `public/android-chrome-512x512.png` — leave for back-compat with legacy auto-discovery on older clients.

## 3. Manifest

- [x] 3.1 Create `app/manifest.ts` exporting a default `MetadataRoute.Manifest` with the exact field values listed in `design.md` D4 (`name`, `short_name`, `description`, `start_url: '/'`, `display: 'standalone'`, `orientation: 'portrait'`, `background_color: '#25194e'`, `theme_color: '#25194e'`).
- [x] 3.2 In the same file, declare `icons` with two entries: 192×192 and 512×512 from `/icons/`, both with `type: 'image/png'` and `purpose: 'any maskable'`. **APPLY-TIME PIVOT (see design.md D4):** Next's `MetadataRoute.Manifest` type does not accept space-separated `purpose`. Split into four entries — same two files, each declared once with `purpose: 'any'` and once with `purpose: 'maskable'`. Browsers de-duplicate by URL; no runtime cost.
- [x] 3.3 Type-check that `MetadataRoute.Manifest` accepts the file (`npx tsc --noEmit` clean on `app/manifest.ts`).

## 4. Service worker

- [x] 4.1 Replace the stub `app/sw.ts` with the real implementation: import `Serwist` from `serwist`, declare the `WB_MANIFEST` type if needed, instantiate `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: true, clientsClaim: true, navigationPreload: true })`, and call `serwist.addEventListeners()`.
- [x] 4.2 Do NOT import `defaultCache` from `@serwist/next/worker`; do NOT register any `runtimeCaching` strategies. The SW is precache-only.
- [x] 4.3 In `withSerwist({...})` add `additionalPrecacheEntries: [{ url: '/manifest.webmanifest', revision: null }, { url: '/icons/icon-192.png', revision: null }, { url: '/icons/icon-512.png', revision: null }]`.
- [x] 4.4 Add a `self.addEventListener('message', ...)` handler in `app/sw.ts` implementing the `KILL_SW` contract from the `pwa-shell` spec: iterate `caches.keys()` + `caches.delete(...)`, then `self.registration.unregister()`. Use a typed message guard (`event.data === 'KILL_SW'` OR `event.data?.type === 'KILL_SW'`).
- [x] 4.5 Update `tsconfig.json` to include `@serwist/next/typings` and add `"WebWorker"` to the `lib` array so `self`, `caches`, and `ServiceWorkerGlobalScope` type-check inside `app/sw.ts`.
- [x] 4.6 Add `public/sw.js`, `public/sw.js.map`, and `public/swe-worker-*.js` to `.gitignore`. — also added `workbox-*.js` for safety.

## 4b. SW registration (added during apply)

- [x] 4b.1 **NEW (see design.md D6):** `@serwist/next` 9.5.x does not auto-register the SW. Add `app/ui/components/ServiceWorkerRegistration.tsx` (`'use client'`) that calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` from a `useEffect`. Mount from `app/layout.tsx` inside `<body>`.

## 5. Apple meta tags

- [x] 5.1 Verify `app/layout.tsx` still contains the four existing entries: `apple-mobile-web-app-capable: 'yes'`, `apple-mobile-web-app-title: 'Ctrl+List'`, `apple-mobile-web-app-status-bar-style: 'default'`, `format-detection: 'telephone=no'`. Do NOT remove or change these (design D7).
- [x] 5.2 Do NOT add a `<meta name="theme-color">` tag in `app/layout.tsx` — `theme_color` lives in the manifest only (design D9). Verified absent.

## 6. Manual verification (run after build, before merge)

- [x] 6.1 Run `npm run build && npm run start`, load `http://localhost:3000` in Chrome (desktop) → DevTools → Application → Manifest. Confirm: name = "Ctrl+List", display = standalone, theme/background = `#25194e`, two icons present with the maskable preview rendering without clipping the logo. — Programmatic check confirmed all manifest fields (`name`, `display: 'standalone'`, `theme_color: '#25194e'`, `background_color: '#25194e'`, 4 icon entries spanning 192/512 × any/maskable). **Maskable visual preview still needs human eyes in Chrome DevTools' Manifest panel before final merge.**
- [x] 6.2 Same session → Application → Service Workers. Confirm a registration exists at scope `/`, source `/sw.js`, status "activated and is running". — Confirmed programmatically: `activeState: 'activated'`, `scope: 'http://localhost:3000/'`, `scriptURL: 'http://localhost:3000/sw.js'`, `controllerExists: true`.
- [x] 6.3 Same session → Application → Cache Storage. Expand each cache: confirm no entry has `Content-Type: text/html`. Confirm `/icons/icon-192.png` and `/icons/icon-512.png` are present. — Confirmed: single cache `serwist-precache-v2-http://localhost:3000/`, contains both icons + `/manifest.webmanifest`, zero entries with `text/html` content-type after navigation.
- [x] 6.4 Network tab → reload the page. Confirm requests for `/icons/icon-*.png` show "(ServiceWorker)" as the source, and the navigation request to `/` does NOT show ServiceWorker as the source. — Confirmed via `performance.getEntriesByName` on `/icons/icon-192.png`: `workerStart: 102738.3` (non-zero = SW handled), `transferSize: 0` (no network). Navigation HTML requests do not get cached (covered by 6.3).
- [x] 6.5 Kill-switch verification: in DevTools console, run `navigator.serviceWorker.controller.postMessage('KILL_SW')`. After one second, run `await navigator.serviceWorker.getRegistration()` — must return `undefined` — and `(await caches.keys()).length` — must return `0`. — Confirmed: before { caches: 1, regExists: true } → after KILL_SW { caches: 0, regExists: false }.
- [ ] 6.6 On a real Android device (or Chrome DevTools device mode + a deployed preview URL), confirm the "Install app" / "Add to Home Screen" prompt becomes available. — **Cannot be performed by Claude; requires real device or human-driven Chrome DevTools.** All programmatic install-criteria (manifest valid, icons present at required sizes, SW registered and controlling, HTTPS via Vercel) are met.
- [ ] 6.7 On a real iOS device (or Safari Web Inspector + a deployed preview URL), open Share → "Add to Home Screen". Confirm the installed icon uses the new 180×180 apple-touch-icon and that the standalone window opens with no browser chrome. — **Cannot be performed by Claude; requires real iOS device.** Apple meta tags + 180×180 apple-touch-icon verified in place.
- [x] 6.8 In `npm run dev` mode at `http://localhost:3000`, confirm `await navigator.serviceWorker.getRegistration()` resolves to `undefined` (dev disable from task 1.2 is working). — Confirmed: `swRegistered: false`, `/sw.js` returns 404 (Serwist wrapper bypassed entirely in dev).

## 7. Pre-merge

- [x] 7.1 `npm run lint` — zero errors, zero warnings. — 0 errors. **1 pre-existing warning** in `app/(main)/users/ui/components/Avatar.tsx:35` (`<img>` instead of `<Image>`) from commit `93b3782`, unrelated to this change and not introduced here. Recommend addressing in a separate change.
- [x] 7.2 `npx tsc --noEmit` — zero errors. — clean.
- [x] 7.3 `npm run build` — completes successfully, including type-check and production bundle, with `public/sw.js` emitted. — `public/sw.js` 38 KB emitted; `/manifest.webmanifest` registered as static route.
