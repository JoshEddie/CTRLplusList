# pwa-shell Specification

## Purpose

Defines the installability contract for Ctrl+List: the Web App Manifest the app serves, the service-worker scope and precache policy that makes it installable on Android/iOS, and the kill-switch + dev-disable invariants that bound the service worker's blast radius. Establishes that the service worker NEVER caches HTML — viewer-scoped pages (lists, items, purchases with spoiler hiding) must not be served from a client cache that doesn't see the server's `revalidateTag` discipline.

## Requirements

### Requirement: Web App Manifest is served at the Next.js manifest convention path

The app SHALL declare a Web App Manifest via `app/manifest.ts` exporting a `MetadataRoute.Manifest`. Next.js SHALL auto-inject the corresponding `<link rel="manifest">` into the document head. The manifest SHALL declare:

- `name: 'Ctrl+List'`
- `short_name: 'Ctrl+List'`
- `description` matching the existing root metadata description
- `id: '/'` and `scope: '/'` — the install-identity pin: without `id`, the home-screen icon's identity derives from whichever URL the browser had open at install time (which is how a beta install landed off-root); `id` pins the identity to `/` regardless of install URL, and `scope` keeps in-app navigation in standalone mode instead of bouncing out-of-scope links to the browser
- `start_url: '/'`
- `display: 'standalone'`
- `orientation: 'portrait'`
- `background_color: '#25194e'` (matching the `--page-frame-gradient` start in `app/ui/styles/global.css`)
- `theme_color: '#25194e'`
- Icon entries covering both 192×192 and 512×512 PNGs served from `/icons/`, with both `purpose: 'any'` and `purpose: 'maskable'` represented for each size. (Next's `MetadataRoute.Manifest` type does not accept space-separated `purpose` values, so each size is declared twice — once per purpose — referencing the same file.)

The manifest SHALL NOT declare a `gcm_sender_id`, push-subscription config, or any field tied to Web Push — push notifications are out of scope for this capability.

#### Scenario: Manifest endpoint returns expected JSON

- **WHEN** an HTTP GET is made to `/manifest.webmanifest`
- **THEN** the response is JSON with `Content-Type: application/manifest+json`, includes the fields above with the stated values — including `id: '/'`, `scope: '/'`, and `orientation: 'portrait'` — and the `icons` array contains entries with `sizes: '192x192'` and `sizes: '512x512'` whose `src` values resolve to existing files under `public/icons/`.

#### Scenario: Document head links to the manifest

- **WHEN** any route under `app/` is server-rendered
- **THEN** the HTML response contains a `<link rel="manifest" href="/manifest.webmanifest">` tag in `<head>`, injected by Next.js based on the `app/manifest.ts` convention.

### Requirement: A service worker is registered for every route and serves only non-HTML assets

The app SHALL ship a service worker compiled from `app/sw.ts` via `@serwist/next`, emitted to `public/sw.js` at build time, with scope `/`. The service worker SHALL precache (a) the entries injected into `self.__SW_MANIFEST` by Serwist (Next's content-hashed JS / CSS / font bundles) and (b) the manifest file `/manifest.webmanifest` and the icon files under `/icons/`. The service worker SHALL NOT register any runtime caching strategy for navigation requests, API responses, or any other HTML resource — every navigation and every `fetch` to an HTML or JSON endpoint SHALL bypass the service worker cache and hit the network.

#### Scenario: SW is registered after first visit

- **WHEN** a user visits any route on a supported browser (Chrome / Edge / Firefox / Safari)
- **THEN** `navigator.serviceWorker.controller` is non-null on the subsequent navigation, and the registration's `scope` is the origin root `/`.

#### Scenario: HTML responses are not served from SW cache

- **WHEN** the user navigates to any route after the service worker has activated
- **THEN** the navigation request appears in the network panel with `Service Worker` absent from the response source (i.e., the request was passed through, not handled by the SW), and the DevTools "Application → Cache Storage" panel contains no entries whose `Content-Type` is `text/html`.

#### Scenario: Public icons are served from precache on repeat visit

- **WHEN** the user visits the app a second time after the service worker has activated
- **THEN** requests for `/icons/icon-192.png` and `/icons/icon-512.png` are served from the SW precache (visible as `(ServiceWorker)` source in DevTools), not the network.

### Requirement: Service worker exposes a kill-switch message handler

`app/sw.ts` SHALL register a `message` event listener that, on receiving `event.data === 'KILL_SW'` (or `event.data?.type === 'KILL_SW'`), performs in order:

1. Iterates `caches.keys()` and `caches.delete(key)` for each entry.
2. Calls `self.registration.unregister()`.

This handler exists so a future SW deploy can self-disable across the user base by posting the kill message to itself during install, without requiring users to manually clear browser data.

#### Scenario: KILL_SW message clears caches and unregisters

- **WHEN** a page in DevTools executes `navigator.serviceWorker.controller.postMessage('KILL_SW')`
- **THEN** within one task tick, `caches.keys()` resolves to an empty array and `navigator.serviceWorker.getRegistration()` resolves to `undefined`.

### Requirement: iOS Apple meta tags remain authoritative on iOS

The existing `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, and `format-detection` meta entries in `app/layout.tsx` SHALL be retained. They SHALL NOT be removed or refactored into the manifest, because iOS Safari does not honor the Web App Manifest's standalone mode, title, or status-bar style fields. The status-bar style SHALL be `black-translucent` — NOT `default` — so the body's fixed purple gradient shows through the iOS status bar in standalone mode (`default` renders an opaque white bar over the app's gradient; iOS ignores the manifest's `theme_color`, so the meta entry is the only control).

#### Scenario: Apple meta tags remain present after this change

- **WHEN** any route is server-rendered
- **THEN** the response HTML contains `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Ctrl+List">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, and `<meta name="format-detection" content="telephone=no">`.

### Requirement: Service worker registration is disabled in development

In `process.env.NODE_ENV === 'development'`, the Serwist plugin SHALL be configured with `disable: true` (or equivalent) so that no service worker is registered against `http://localhost:3000`. This prevents stale SW state from persisting across local code changes and HMR reloads.

#### Scenario: No SW registration in dev

- **WHEN** the developer runs `npm run dev` and loads the app at `http://localhost:3000`
- **THEN** `navigator.serviceWorker.getRegistration()` resolves to `undefined` and the network panel shows no `sw.js` request.

#### Scenario: SW registration in production build

- **WHEN** the app is loaded from a Vercel deployment (preview or production)
- **THEN** `navigator.serviceWorker.getRegistration()` resolves to a registration after first paint, and a request to `/sw.js` is visible in the network panel on first visit.

### Requirement: The ServiceWorkerRegistration component registers the service worker on the client

The `ServiceWorkerRegistration` component at `app/ui/components/ServiceWorkerRegistration.tsx` — a `'use client'` component mounted once in the root `app/layout.tsx` — SHALL, on mount, register the service worker. On mount it SHALL:

1. Guard on feature detection: if `'serviceWorker' in navigator` is false, it SHALL no-op (register nothing, throw nothing).
2. When the API is available, it SHALL call `navigator.serviceWorker.register('/sw.js', { scope: '/' })` — exactly the path `/sw.js` (matching the `swDest` emitted by `@serwist/next`) and exactly the scope `/` (the origin root, matching the SW's declared scope in R2).
3. It SHALL swallow a registration rejection via `.catch(() => {})` so a failed registration does not surface an unhandled rejection.

The component SHALL render nothing (`return null`) — it contributes no DOM and exists only for its mount side effect. The registration SHALL fire once per mount (the effect's dependency array is empty); a rerender SHALL NOT trigger a second `register` call.

#### Scenario: Registers /sw.js at scope / when the API is available

- **WHEN** `<ServiceWorkerRegistration />` mounts and `'serviceWorker' in navigator` is true
- **THEN** `navigator.serviceWorker.register` is called exactly once with the arguments `('/sw.js', { scope: '/' })`

#### Scenario: No-ops when the Service Worker API is unavailable

- **WHEN** `<ServiceWorkerRegistration />` mounts in an environment where `'serviceWorker' in navigator` is false
- **THEN** no registration is attempted and the component does not throw

#### Scenario: Registration rejection is swallowed

- **WHEN** `<ServiceWorkerRegistration />` mounts and `navigator.serviceWorker.register` returns a rejected promise
- **THEN** the rejection is caught and does not surface as an unhandled rejection, and the component continues to render normally

#### Scenario: Component renders nothing

- **WHEN** `<ServiceWorkerRegistration />` is rendered
- **THEN** it produces no DOM output (its rendered result is `null`)

#### Scenario: Registration fires once per mount

- **WHEN** `<ServiceWorkerRegistration />` is mounted and then rerendered without remounting
- **THEN** `navigator.serviceWorker.register` is called exactly once total (the mount effect does not re-run on rerender)

### Requirement: Standalone display SHALL expose and clear the device safe areas

The root layout's viewport export SHALL declare `viewportFit: 'cover'` — the setting that makes `env(safe-area-inset-*)` resolve to real values on notched devices and lets the app paint edge-to-edge in standalone mode. With the viewport extended into the notch and home-indicator zones, the app SHALL keep its chrome clear of them:

- The `html` element SHALL carry the background color `#25194e`, the backstop visible through the translucent iOS status bar (and below the content in the home-indicator zone) even where `body` backdrops are clipped.
- The app-nav SHALL absorb `env(safe-area-inset-top)` into its height and top padding so the logo and menu render below the notch, and the `--app-nav-height` token SHALL include the inset so dependent sticky offsets stay correct.
- The floating items-pagination overlay SHALL include `env(safe-area-inset-bottom)` as an additive term in its bottom padding, so its controls clear the home indicator while the overlay box itself stays flush with its container's bottom edge.
- The toast container SHALL offset its top and right anchors by `env(safe-area-inset-top)` / `env(safe-area-inset-right)` so top-positioned toasts clear the status-bar zone.

Ownership note: the *layout* contracts of these regions belong to their owning capabilities — `app-frame` (nav frame), `items-browser-chrome` (pagination overlay position, alpha, and full-width anchoring). This requirement owns only the cross-cutting **safe-area participation** those layouts acquire under `viewportFit: 'cover'`; it SHALL NOT be read as redefining either layout.

#### Scenario: Viewport exposes the safe areas

- **WHEN** any route is server-rendered
- **THEN** the viewport meta contains `viewport-fit=cover`

#### Scenario: Nonzero top inset keeps nav and toasts below the notch

- **WHEN** the UA reports a nonzero top safe-area inset
- **THEN** the app-nav's rendered height and top padding grow by that inset
- **AND** the toast container's top offset includes that inset

#### Scenario: Nonzero bottom inset lifts pagination clear of the home indicator

- **WHEN** the UA reports a nonzero bottom safe-area inset on a page rendering the floating items-pagination overlay
- **THEN** the overlay's bottom padding grows by that inset
- **AND** the overlay box remains flush with its container's bottom edge

#### Scenario: Status-bar and home-indicator zones show the app background

- **WHEN** any route renders
- **THEN** the `html` element's computed background color is `#25194e`
