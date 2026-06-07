## MODIFIED Requirements

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

### Requirement: iOS Apple meta tags remain authoritative on iOS

The existing `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, and `format-detection` meta entries in `app/layout.tsx` SHALL be retained. They SHALL NOT be removed or refactored into the manifest, because iOS Safari does not honor the Web App Manifest's standalone mode, title, or status-bar style fields. The status-bar style SHALL be `black-translucent` — NOT `default` — so the body's fixed purple gradient shows through the iOS status bar in standalone mode (`default` renders an opaque white bar over the app's gradient; iOS ignores the manifest's `theme_color`, so the meta entry is the only control).

#### Scenario: Apple meta tags remain present after this change

- **WHEN** any route is server-rendered
- **THEN** the response HTML contains `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Ctrl+List">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, and `<meta name="format-detection" content="telephone=no">`.

## ADDED Requirements

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
