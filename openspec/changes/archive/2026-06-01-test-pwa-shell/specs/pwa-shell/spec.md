## ADDED Requirements

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
