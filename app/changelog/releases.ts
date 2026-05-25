/**
 * Release log for CTRLplusList.
 *
 * Append a new `Release` literal to the top of `releases` for each cut.
 * Each `Change` entry's `type` must be one of the six labels:
 * feature | polish | bug | security | docs | refactor.
 *
 * Authoring gradient: specific user-affecting changes get their own entry;
 * cross-cutting work (e.g. design-system retokenization) rolls up into one
 * `polish` entry. Pure-internal refactors are omitted.
 */

export type ChangeType =
  | 'feature'
  | 'polish'
  | 'bug'
  | 'security'
  | 'docs'
  | 'refactor';

export type Change = {
  type: ChangeType;
  summary: string;
};

export type Release = {
  version: string; // semver, e.g. "1.0.0"
  date: string; // ISO date, e.g. "2026-05-22"
  changes: Change[];
};

export const releases: Release[] = [
  {
    version: '1.0.0',
    date: '2026-05-22',
    changes: [
      {
        type: 'feature',
        summary:
          'PWA shell with installable home-screen icon, offline-friendly app frame, and iOS safe-area handling for the bottom navigation and pagination.',
      },
      {
        type: 'feature',
        summary:
          'New social model: visit history, bookmarks, and follow-users replace the legacy share-lists flow. Existing shares are preserved server-side and surfaced via a one-time onboarding toast.',
      },
      {
        type: 'feature',
        summary:
          'Items browser with pagination, sortable columns, and store / price filters; mobile filter sheet for small viewports.',
      },
      {
        type: 'feature',
        summary:
          'Multi-claim purchases and per-item archival — items can have multiple buyers up to a configurable quantity limit, and owners can hide completed items without losing purchase history.',
      },
      {
        type: 'feature',
        summary:
          'Image-search integration backed by a provider chain (SerpAPI → Serper → mock) with in-memory result caching and a per-user rate limit on `/api/image-search`.',
      },
      {
        type: 'polish',
        summary:
          'Design-system primitives — button, form-field, menu, popover, segmented-control — adopted across auth, lists, items, user, and settings surfaces. Full retokenization of color, spacing, and typography against `global.css` variables.',
      },
      {
        type: 'security',
        summary:
          'Server-endpoint authorization contract: every server action now validates session ownership before mutating, with regression coverage tracked via OpenSpec capability specs.',
      },
      {
        type: 'docs',
        summary:
          'OpenSpec workflow adoption with ~20 capability specs and the `/opsx:*` slash-command surface. Project conventions (PWA build flag, image-search provider chain, dev auth bypass, Neon HTTP no-transactions rule) consolidated into `CLAUDE.md` and the OpenSpec capability specs.',
      },
    ],
  },
];
