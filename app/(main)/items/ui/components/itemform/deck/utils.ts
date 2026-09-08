// Pure validation/tier helpers shared by the deck cards, Focus editors,
// Triage, Preview, and the submit gate — the single source for the
// title/price/description rules so they can't drift between surfaces.

import {
  isValidProductUrl,
  priceTier,
  type TierResult,
} from '@/lib/storeValidity';
import type { RowField } from './focus';
import type { DeckStore, ItemViewModel } from './viewModel';

export type { Tier, TierResult } from '@/lib/storeValidity';
export type { RowField } from './focus';
export { priceTier };

// Candidates whose natural dimensions fall below this (px, both axes) are
// dropped. Extractors routinely include tiny thumbnails (e.g. Amazon's 40px
// `_AC_US40_` variant) that are useless as the item image.
const MIN_IMAGE_PX = 200;

// A stalled load shouldn't block the deck from opening.
const PROBE_TIMEOUT_MS = 6000;

export const NAME_MIN = 3;
export const NAME_MAX = 100;
export const NAME_SNAPPY = 50;
export const DESCRIPTION_MAX = 100;

export function nameTier(name: string | null | undefined): TierResult {
  const value = name ?? '';
  if (!value.trim()) {
    return { tier: 'error', note: 'An item needs a name.' };
  }
  if (value.length < NAME_MIN) {
    return {
      tier: 'error',
      note: `An item name needs at least ${NAME_MIN} characters.`,
    };
  }
  if (value.length > NAME_MAX) {
    return {
      tier: 'error',
      note: `That's over the ${NAME_MAX}-character limit — trim it before saving.`,
    };
  }
  if (value.length > NAME_SNAPPY) {
    return {
      tier: 'warn',
      note: `Longer than ${NAME_SNAPPY} characters — we suggest trimming; extra detail belongs in a description.`,
    };
  }
  return { tier: 'good', note: '' };
}

export function photoTier(photos: string[]): TierResult {
  if (photos.length === 0) {
    return { tier: 'warn', note: 'No photo yet — add one.' };
  }
  return { tier: 'good', note: '' };
}

// The store row covers the name + link pair only (price is owned by
// priceTier). Symmetric coupling: both empty is a supported linkless state
// (good); either present requires the other. No warn tier for the store.
export function storeTier(
  store: Pick<DeckStore, 'name' | 'link'> | null | undefined
): TierResult {
  const name = store?.name?.trim() ?? '';
  const link = store?.link?.trim() ?? '';
  if (name === '' && link === '') {
    // Linkless is a valid, optional state — not a found-and-verified store, so
    // the row reads "Optional" rather than the good-tier "Looks good" default.
    return { tier: 'good', note: 'Optional' };
  }
  if (link === '') {
    return { tier: 'error', note: 'A store name needs a link.' };
  }
  if (name === '') {
    return { tier: 'error', note: 'The store needs a name.' };
  }
  if (!isValidProductUrl(store!.link)) {
    return { tier: 'error', note: 'The store needs a valid link.' };
  }
  return { tier: 'good', note: '' };
}

// The single definition of "linkless": store name AND link both empty. A
// name-only orphan store is NOT linkless — its store affordances must stay
// visible so the error-tier pair can be repaired or cleared.
function isBareStore(store: Pick<DeckStore, 'name' | 'link'>): boolean {
  return (
    (store.name?.trim() ?? '') === '' && (store.link?.trim() ?? '') === ''
  );
}

/** The derived linkless lock: a linkless item is never offered store
name/link entry (deck step, Preview row, Triage row). State-derived so
door-created items and legacy PRICED/BARE rows are treated identically. */
export function isLinkless(item: ItemViewModel): boolean {
  return isBareStore(item.store);
}

// Measures user-entered work only: a failure-path seeded store link is not
// effort worth guarding, so it doesn't count.
export function isDirtyDraft(item: ItemViewModel): boolean {
  return (
    item.name.trim() !== '' ||
    item.description.trim() !== '' ||
    item.photos.length > 0 ||
    item.store.name.trim() !== '' ||
    item.store.price.trim() !== ''
  );
}

export const LINKLESS_PRICE_NOTE = 'No price — saves without one';

// Price validity in store context (D2): priceTier stays a pure format check;
// the "empty price is fine when linkless" rule composes here. An empty price is
// good (with a neutral note) only for a linkless store — name and link both
// empty. A malformed non-empty price is an error regardless.
export function pricePairTier(
  store: Pick<DeckStore, 'name' | 'link' | 'price'>
): TierResult {
  const priceEmpty = (store.price ?? '').trim() === '';
  if (isBareStore(store) && priceEmpty) {
    return { tier: 'good', note: LINKLESS_PRICE_NOTE };
  }
  return priceTier(store.price);
}

export type RowTiers = Record<RowField, TierResult>;

export function rowTiers(item: ItemViewModel): RowTiers {
  return {
    photo: photoTier(item.photos),
    name: nameTier(item.name),
    // The note is the one field whose emptiness is fine by design — "Looks
    // good" on absent content would be a false verdict, so the good tier
    // carries "Optional" until something is written.
    note:
      item.description.length > DESCRIPTION_MAX
        ? {
            tier: 'error',
            note: `Over the ${DESCRIPTION_MAX}-character limit — trim it.`,
          }
        : { tier: 'good', note: item.description ? '' : 'Optional' },
    price: pricePairTier(item.store),
    store: storeTier(item.store),
  };
}

// The Fill-manually advance rule: no error anywhere, every warn seen at least
// once. Expressed over tiers alone — a field whose tier rules change later is
// governed here without amendment.
export function manualAdvanceReady(
  tiers: RowTiers,
  visited: ReadonlySet<RowField>
): boolean {
  const rows = Object.entries(tiers) as [RowField, TierResult][];
  return (
    rows.every(([, row]) => row.tier !== 'error') &&
    rows.every(([field, row]) => row.tier !== 'warn' || visited.has(field))
  );
}

function probe(url: string): Promise<{ url: string; ok: boolean }> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ url, ok });
    };
    img.onload = () =>
      done(
        img.naturalWidth >= MIN_IMAGE_PX && img.naturalHeight >= MIN_IMAGE_PX
      );
    img.onerror = () => done(false);
    // A stalled load shouldn't hang the deck — keep it (benefit of the doubt).
    // The `settled` guard makes this a no-op if the probe already resolved.
    setTimeout(() => done(true), PROBE_TIMEOUT_MS);
    img.src = url;
  });
}

// Probe each candidate's natural size client-side (we never fetch bytes
// server-side — no SSRF surface) and drop undersized or unloadable images.
// Run ONCE at fetch time, before the deck is built, so the photo count, the
// step decision (selector / single-image bypass / zero-image error), and the
// selector itself all reflect the same set of usable photos.
export function prunePhotos(urls: string[]): Promise<string[]> {
  // 0 or 1 candidate: nothing to choose or prune.
  if (urls.length < 2) return Promise.resolve(urls);
  return Promise.all(urls.map(probe)).then((results) => {
    const survivors = results.filter((r) => r.ok).map((r) => r.url);
    // Never collapse a real candidate list to "no images" — if every probe
    // failed the size check, keep the extractor's main as a best effort.
    return survivors.length > 0 ? survivors : urls.slice(0, 1);
  });
}

// Bridge the string-based store price (view-model / schema) and PriceField's
// numeric (dollars) interface. An empty/non-numeric price maps to null so
// PriceField shows a blank field rather than "0.00".
export function priceToAmount(price: string): number | null {
  const trimmed = (price ?? '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

// Serialize PriceField's numeric value to a clean 2dp string. 0 is a real price
// a user may type ($0.00 is valid — D6); the "never silently $0.00" guard lives
// at the fetch seam (normalizePrice rejects a fetched 0), not here. An unset
// price is the never-entered "" state, surfaced by priceToAmount as a blank field.
export function amountToPrice(value: number): string {
  return value.toFixed(2);
}

// Offer a shorter name by cutting at the first natural clause boundary that
// fits the snappy budget — the lead clause is almost always the core product
// name, and the trailing detail (size/color/variant) is what belongs in a
// description. Spaced dashes/pipes/colons/semicolons, commas, and opening
// parens count as boundaries; intra-word hyphens (e.g. "T-Shirt") do not.
export function suggestTrim(name: string | null | undefined): string {
  const value = (name ?? '').trim();
  if (value.length <= NAME_SNAPPY) return value;

  const boundary = /\s[—–\-|:;]\s|,|\s\(/g;
  let cut = -1;
  for (let m = boundary.exec(value); m; m = boundary.exec(value)) {
    if (m.index > 0 && m.index <= NAME_SNAPPY) {
      cut = m.index;
      break;
    }
  }
  if (cut > 0) return value.slice(0, cut).trim();

  const window = value.slice(0, NAME_SNAPPY);
  const lastSpace = window.lastIndexOf(' ');
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim();
}

export type TitleLine = { title: string; line: string };

type IntroSummary = {
  confirmed: TitleLine[];
  warning: TitleLine[];
  error: TitleLine[];
};

export function summarize(item: ItemViewModel): IntroSummary {
  const store = item.store;
  const confirmed: TitleLine[] = [];
  const warning: TitleLine[] = [];
  const error: TitleLine[] = [];

  if (item.photos.length > 0) {
    const count = item.photos.length;
    confirmed.push({
      title: 'Photos',
      line: `${count} option${count === 1 ? '' : 's'} found`,
    });
  } else {
    warning.push({ title: 'Photos', line: 'No photos found — add one' });
  }

  const tier = nameTier(item.name).tier;
  if (tier === 'good') {
    confirmed.push({ title: 'Item name', line: item.name });
  } else if (tier === 'warn') {
    warning.push({ title: 'Item name', line: 'Review the name for best results' });
  } else {
    error.push({ title: 'Item name', line: 'Name is too long' });
  }

  if (store && priceTier(store.price).tier === 'good') {
    confirmed.push({ title: 'Price', line: `$${store.price.replace(/^\$/, '')}` });
  } else {
    warning.push({ title: 'Price', line: 'Unable to find price' });
  }

  if (store && storeTier(store).tier === 'good') {
    confirmed.push({ title: 'Store', line: `${store.name} • link saved` });
  } else {
    warning.push({ title: 'Store', line: 'Unable to find the store name' });
  }

  return { confirmed, warning, error };
}
