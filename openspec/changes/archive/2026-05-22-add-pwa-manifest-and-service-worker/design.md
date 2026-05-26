## Context

The app already ships `apple-mobile-web-app-capable: 'yes'` and related Apple meta tags from [app/layout.tsx](app/layout.tsx), and `public/` contains `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, and favicons. What's missing for installability is (a) a Web App Manifest declaring app identity / display mode / colors / icon set, and (b) a registered service worker (Chrome's install criteria require one even if it does little).

The app's content model makes service-worker scope a load-bearing decision. Almost every protected route is **viewer-scoped**: list visibility (private / unlisted / public), bookmark state, purchase claims with spoiler hiding, owner-only edit chrome. A naive client-side HTML cache could serve User A's view of `/lists/abc` to User B after a sign-out / sign-in on the same device, or hold a pre-mutation HTML payload after a server-side `revalidateTag(...)` has already refreshed the DAL cache. The server-side `'use cache'` + `cacheTag` discipline in `lib/dal.ts` does not extend into the browser SW.

Database driver `drizzle-orm/neon-http` is irrelevant to this change (no DB reads, no DB writes), as is the cross-cutting design-system layer (no interactive surfaces added). The change touches the root document (`app/layout.tsx`) and adds new top-level files — outside the scope of `app-frame`, which governs `app/(main)/layout.tsx`.

## Goals / Non-Goals

**Goals:**

- Ship a Web App Manifest sufficient for Android's install prompt and iOS "Add to Home Screen" with correct name, icons, and colors.
- Register a service worker that precaches **Next-emitted build assets and public icons only** — never HTML — so installability criteria are met without introducing a viewer-identity cache risk.
- Establish the file shape, build pipeline, and kill-switch SW so a future "add push notifications" change can extend `app/sw.ts` without restructuring.
- Verify `@serwist/next` works on Next 16.2 in the proposal's task list (peer deps say `next: >=14.0.0` with no upper bound — needs a real build to confirm).

**Non-Goals:**

- HTML route caching of any kind, including stale-while-revalidate for public routes. Deferred to a future change once the cache-tag / SW-cache invalidation story is designed.
- Offline fallback pages. Deferred — when the app loses network, the network-only SW will surface the browser's default offline UI, which is acceptable for v1.
- Web Push, VAPID keys, push subscription tables, push handlers in the SW. Push triggers (follow, bookmark-modified, item-purchased) and the opt-in UX (per-follow popup, per-bookmark toggles for new-items vs purchases) belong in a separate change.
- An in-app "Install Ctrl+List" prompt component. Deferred — Android's native install banner is enough for v1.
- Multi-environment SW behavior beyond dev/prod. Preview deploys on Vercel will register the SW the same as prod.

## Decisions

### D1. Tooling: `@serwist/next` (Serwist 9.5.x), not hand-rolled, not `next-pwa`

**Choice:** `npm i @serwist/next` (runtime) and `npm i -D serwist` (build).

**Why:** Serwist is the actively maintained successor to `next-pwa`, has first-class App Router support, and its peer-dep `next: >=14.0.0` has no upper bound (confirmed via `npm view @serwist/next@latest peerDependencies` — `9.5.11` is current stable). `next-pwa` is in maintenance mode and was designed for the Pages Router. A hand-rolled SW (~30 lines for our minimal scope) would also work but loses precache-manifest auto-generation, which is the main thing we want from Workbox-lineage tooling — the precache manifest is what makes Next's content-hashed JS/CSS chunks invalidate correctly across deploys.

**Alternative considered (`next-pwa`):** Rejected. Pages-Router-first, not App-Router-native, sporadic releases.

**Alternative considered (hand-rolled SW):** Rejected for this change but kept on the table as a fallback if Serwist+Next 16 has issues — see R1.

### D2. SW caching scope: precache **Next build assets + public icons only**. No HTML caching.

**Choice:** `app/sw.ts` uses `precacheEntries: self.__SW_MANIFEST` (Serwist injects Next's static assets at build time) plus an explicit `additionalPrecacheEntries` list for the manifest and the public icons. **No runtime caching strategies are registered** — `defaultCache` from `@serwist/next/worker` is NOT imported. All navigations and API calls bypass the SW and hit the network.

**Why:** This is the load-bearing decision. HTML responses for protected routes encode the _current viewer's_ permissions, bookmark state, purchase claims, and spoiler reveal state. Caching them on the client would let the same browser session serve stale, cross-viewer, or pre-mutation HTML. The server-side `'use cache'` + `cacheTag` system in `lib/dal.ts` is opaque to the SW — there's no client-side hook into `revalidateTag`. By caching only content-hashed JS/CSS/font chunks and the public icon directory, we get installability (a registered SW is enough for Chrome's criteria) without introducing this class of bug.

**Alternative considered (cache public marketing pages with SWR):** Rejected for now. The app doesn't currently have a meaningful set of public, viewer-agnostic HTML pages worth caching — even the home digest is personalized.

**Alternative considered (cache public list views for unauthenticated readers):** Rejected for now. Public lists _do_ render different HTML for the owner vs. a public visitor vs. a signed-in non-owner; a single cache key per URL would not be safe.

### D3. Manifest location: `app/manifest.ts` (Next file convention)

**Choice:** Use Next.js' file-based manifest convention at `app/manifest.ts` exporting a `MetadataRoute.Manifest`. Next auto-injects `<link rel="manifest">` into the document head.

**Why:** Avoids hand-maintaining a `<link>` tag in `app/layout.tsx`. Type-checked. The convention is supported in Next 16 App Router.

**Alternative considered (static `public/manifest.webmanifest`):** Rejected. Same outcome, less type safety, and would require manually adding the `<link>` in `app/layout.tsx`.

### D4. Manifest contents (concrete values)

```ts
{
  name: 'Ctrl+List',
  short_name: 'Ctrl+List',
  description: 'Create and share your lists with friends and family',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#25194e',   // page-frame gradient start
  theme_color: '#25194e',        // matches Android status bar to gradient
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
```

`#25194e` is `rgb(37, 25, 78)` — the start of `--page-frame-gradient` in [app/ui/styles/global.css](app/ui/styles/global.css:31). User confirmed icons are designed with maskable safe zone.

**Note on `purpose`:** Next's `MetadataRoute.Manifest` type defines `purpose` as a single value (`'any' | 'maskable' | 'monochrome'`), narrower than the W3C spec (which permits space-separated combinations like `'any maskable'`). To preserve type safety without casting, the manifest declares the same icon file twice — once with `purpose: 'any'` and once with `purpose: 'maskable'` — for each size. Browsers de-duplicate by file URL, so this carries no runtime cost.

### D5. Icon layout in `public/`

**Choice:** Add a new `public/icons/` directory containing `icon-192.png` and `icon-512.png` (copied from `appstore-images/android/launchericon-{192,512}x{size}.png`). Replace the existing `public/apple-touch-icon.png` with `appstore-images/ios/180.png`. **Leave** the existing `public/favicon*.png`, `public/favicon.ico`, and the legacy `public/android-chrome-*.png` files **in place** — they're harmless and the latter are still referenced by `apple-touch-icon` auto-discovery on older clients.

**Why:** Keeps the new manifest's icon set in one folder for clarity, doesn't break any in-flight icon references, doesn't require rewriting links in `app/layout.tsx`.

**Alternative considered (consolidate everything under `public/icons/`):** Rejected for this change; could be done in a follow-up cleanup if the duplication bothers.

### D6. SW registration: explicit `<ServiceWorkerRegistration />` client component (revised during apply)

**Choice:** Add a minimal `'use client'` component at `app/ui/components/ServiceWorkerRegistration.tsx` that calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` from a `useEffect`, mounted from `app/layout.tsx`.

**Why:** During apply, the initial assumption — that `@serwist/next` auto-injects a registration script — was found to be wrong for the App Router setup at Serwist 9.5.x. The plugin emits `public/sw.js` at build time but does not inject the `navigator.serviceWorker.register(...)` call into the document; verified by inspecting the rendered HTML head and confirming no script tag references `sw.js`. A 7-line client component closes the gap.

**Original rejected alternative** (left in for archive context): "rely on Serwist auto-registration." Rejected because it does not exist in `@serwist/next` 9.5.x.

### D7. Apple meta tags in `app/layout.tsx`: keep, do not remove

**Choice:** Keep the existing `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `format-detection` entries in `app/layout.tsx`. Do not collapse them into the manifest.

**Why:** iOS Safari does not fully honor the Web App Manifest — `apple-mobile-web-app-*` tags are the authoritative source on iOS for standalone mode, title, and status bar style. The manifest covers the same ground on Android. Keeping both lets each platform read its preferred source. No active spec governs these tags.

### D8. Kill-switch path

**Choice:** The first-ship `app/sw.ts` includes a minimal install/activate hook that:

1. On `activate`, claims clients (`clientsClaim: true`).
2. Exposes a `'KILL_SW'` message handler that `unregister()`s the registration and deletes all caches, so a _future_ code change can ship a single-line update to `sw.ts` that posts that message to itself on install, achieving a remote disable.

**Why:** Once a SW is registered in a user's browser, a buggy SW can persist past the user's next visit even if we delete `app/sw.ts`. The kill-switch is insurance: shipping it now costs ~10 lines and gives us a recoverable path. Cheap insurance against the worst-case PWA failure mode.

### D9. `theme_color` in the manifest vs. `<meta name="theme-color">`

**Choice:** Set `theme_color` only via the manifest (not as a meta tag in `app/layout.tsx`). Manifest's `theme_color` is honored once the app is installed; on the web, Android Chrome reads the meta tag. Since we currently want the installed-app coloring to match the gradient and the in-browser coloring to remain the browser default, manifest-only is the smaller change.

**Why:** Avoids surprising in-browser users with a status-bar color shift they didn't opt into. If we later want the in-browser status bar tinted too, that's an additive change (one meta tag in `app/layout.tsx`).

## Risks / Trade-offs

- **[R1] `@serwist/next` may not build cleanly on Next 16.2.** → Confirmed during apply: Serwist 9.5.x injects a `webpack` config and Next 16 defaults to Turbopack for both `next dev` and `next build`, causing the build to fail with "This build is using Turbopack, with a `webpack` config and no `turbopack` config." → **Applied mitigation (smaller than original fallback):** (a) `package.json` `build` script changed to `next build --webpack` so prod builds opt into webpack explicitly; (b) `next.config.ts` short-circuits the `withSerwist` wrap entirely in `NODE_ENV === 'development'` so `next dev --turbopack` is undisturbed and HMR keeps working. Cost: slower prod builds than Turbopack-native would deliver. Future path: migrate to Serwist "configurator mode" or `@serwist/turbopack` when those stabilize. The original hand-rolled-SW fallback remains in reserve if Serwist ships an incompatible release.

- **[R2] An SW, once installed, can persist a bug for every existing user.** → Mitigation: D8 (kill-switch). Also: keep the SW's job tiny (precache only, no runtime strategies) so the surface area for bugs is minimal.

- **[R3] Maskable icons display with unintended cropping if the safe zone is wrong.** → Mitigation: user confirmed safe zone. Verification task: load the manifest in Chrome DevTools → Application → Manifest and check the maskable preview before merge.

- **[R4] iOS will ignore most of the manifest and continue to read the Apple meta tags.** → Accepted, not mitigated. D7 keeps the meta tags in place. iOS-specific behavior (splash screens, status bar) is governed by `apple-mobile-web-app-*`, which already exists.

- **[R5] Vercel preview deploys will register a SW scoped to the preview URL.** → Accepted. Each preview gets its own origin, so SW caches don't leak between preview and prod. Devs testing PWA changes locally on `http://localhost:3000` should remember to unregister the dev SW in DevTools when done (Serwist disables SW in dev by default, mitigating this further).

- **[R6] The kill-switch (D8) is dormant code until needed; risk it bit-rots before being tested.** → Mitigation: tasks.md includes a one-shot manual verification step that posts the `KILL_SW` message in DevTools and confirms unregister + cache deletion before merge.

## Migration Plan

1. Land this change behind no flag — installability is opt-in by user action (they choose to install or not). No backfill, no data migration, no schema change.
2. Monitor: after deploy, manually verify install flow on (a) Chrome on Android, (b) Safari on iOS, (c) Chrome on desktop. Log any anomalies, decide whether to ship a kill-switch update or roll forward.
3. Rollback: if the SW misbehaves in prod, deploy a follow-up `app/sw.ts` that immediately posts `KILL_SW` on install. Users get unregistered on their next visit.

## Open Questions

- **Q1:** Should `start_url` be `/` or `/home`? `app/(main)/page.tsx` currently renders the home digest at `/`, so `/` is correct unless we want install to land on a deeper page. Default: `/`. Revisit if home-digest UX argues otherwise during apply.
- **Q2:** Are there other icon sizes we should include in `manifest.icons` beyond 192 and 512? Chrome's install criteria require at least 192 _and_ 512; 144 is sometimes useful for older Android. Default: stick with 192 + 512 (Chrome's minimum + recommended). The other sizes from `appstore-images/` are available if a real device shows aliasing.
- **Q3:** Should we add `screenshots` to the manifest for the richer install UI on Android? It's a polish item; defer unless install conversion looks weak after launch.
