import { isPlaceholderUri } from '@/lib/placeholderArt.shared';
import type { ProductData } from '@/lib/product-fetch/types';
import type {
  ItemDetails,
  ItemDisplay,
  ItemStoreTable,
  ItemTable,
  ListTable,
  OptionType,
} from '@/lib/types';

// ItemDisplay carries DB timestamps the render path never reads; a fixed epoch
// stand-in keeps the preview projection pure (no wall-clock dependency).
const PREVIEW_TIMESTAMP = new Date(0);

export interface DeckStore {
  name: string;
  link: string;
  price: string;
  price_fetched_at?: string | null;
  canonical_url?: string | null;
  currency?: string | null;
}

// The ergonomic shape the deck and Preview operate on. It crosses to the
// persisted ItemDetails only at submit, via toItemDetails (D2).
export interface ItemViewModel {
  id: string;
  name: string;
  /** Candidate pool; the active image is photos[photoIndex]. */
  photos: string[];
  photoIndex: number;
  /**
   * Selected transient placeholder-art URI, overriding photos[photoIndex] as
   * the active image while set. Unselected placeholder previews never enter
   * the view-model, so they can never persist.
   */
  placeholder: string | null;
  description: string;
  store: DeckStore;
  lists: OptionType[];
  /** null = unlimited; a number = a per-buyer limit. Defaults to a limit of 1. */
  qty: number | null;
}

const emptyStore = (link = ''): DeckStore => ({ name: '', link, price: '' });

// A factory, not a shared const: each blank item gets its own store/list
// objects so two sessions can't mutate one another's state.
export function blankItem(seedUrl = ''): ItemViewModel {
  return {
    id: '',
    name: '',
    photos: [],
    photoIndex: 0,
    placeholder: null,
    description: '',
    store: emptyStore(seedUrl),
    lists: [],
    qty: 1,
  };
}

export function seedFromFetch(
  product: ProductData,
  pastedUrl: string,
  fetchedAt: string
): ItemViewModel {
  const photos = product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  return {
    id: '',
    name: product.title,
    photos,
    photoIndex: 0,
    placeholder: null,
    // Descriptions are deliberately not seeded — extracted copy is marketing
    // junk or the wrong page block on some sites. The user authors their
    // own note.
    description: '',
    store: {
      name: product.store,
      link: pastedUrl,
      price: product.price ?? '',
      price_fetched_at: product.price ? fetchedAt : null,
      canonical_url: product.canonicalUrl ?? null,
      currency: product.currency ?? null,
    },
    lists: [],
    qty: 1,
  };
}

type SeedItem = Pick<
  ItemTable,
  'id' | 'name' | 'description' | 'image_url' | 'quantity_limit'
> & {
  store: ItemStoreTable | null;
  lists: ListTable[];
  image_candidates?: string[];
};

export function seedFromItem(item: SeedItem): ItemViewModel {
  const photos = item.image_candidates?.length
    ? item.image_candidates
    : item.image_url
      ? [item.image_url]
      : [];
  const activeIndex = item.image_url ? photos.indexOf(item.image_url) : -1;
  return {
    id: item.id,
    name: item.name,
    photos,
    photoIndex: activeIndex >= 0 ? activeIndex : 0,
    // A previously saved placeholder is an ordinary pool image now; the
    // transient-selection slot starts clear.
    placeholder: null,
    description: item.description ?? '',
    store: item.store ? toDeckStore(item.store) : emptyStore(),
    lists: item.lists.map((list) => ({
      value: list.id.toString(),
      label: list.name,
    })),
    qty: item.quantity_limit,
  };
}

function toDeckStore(store: ItemStoreTable): DeckStore {
  return {
    name: store.name,
    link: store.link,
    price: store.price,
    // DB rows carry a Date; the action schema expects an ISO string.
    price_fetched_at:
      store.price_fetched_at instanceof Date
        ? store.price_fetched_at.toISOString()
        : (store.price_fetched_at ?? null),
    canonical_url: store.canonical_url ?? null,
    currency: store.currency ?? null,
  };
}

// Edit a store field immutably. Editing a price means it's no longer the
// fetched snapshot, so its provenance capture time is dropped (item-store-links).
export function setStoreField(
  store: DeckStore,
  field: 'name' | 'link' | 'price',
  value: string
): DeckStore {
  const next = { ...store, [field]: value };
  if (field === 'price') next.price_fetched_at = null;
  return next;
}

// The single view-model → persisted-shape adapter (D2): selected photo becomes
// the active image, the pool becomes image_candidates, qty maps to
// quantity_limit, and store provenance is preserved. Existing create/edit
// actions are unchanged.
export function toItemDetails(vm: ItemViewModel): ItemDetails {
  return {
    id: vm.id,
    name: vm.name,
    description: vm.description,
    image_url: vm.placeholder ?? vm.photos[vm.photoIndex] ?? null,
    // A newly selected placeholder displaces any previously saved one in the
    // pool — server validation admits at most one placeholder URI.
    image_candidates: vm.placeholder
      ? [...vm.photos.filter((url) => !isPlaceholderUri(url)), vm.placeholder]
      : vm.photos,
    quantity_limit: vm.qty,
    store: {
      name: vm.store.name,
      link: vm.store.link,
      price: vm.store.price,
      price_fetched_at: vm.store.price_fetched_at ?? null,
      canonical_url: vm.store.canonical_url ?? null,
      currency: vm.store.currency ?? null,
    },
    lists: vm.lists,
  };
}

// Render-only projection into the shape the real ItemCard consumes, so Preview
// shows the exact production list card rather than a lookalike. Distinct from
// toItemDetails (the persist projection): no list membership, no candidate
// pool — only what the card paints.
export function toItemDisplay(vm: ItemViewModel): ItemDisplay {
  return {
    id: vm.id || 'preview',
    name: vm.name,
    description: vm.description,
    image_url: vm.placeholder ?? vm.photos[vm.photoIndex] ?? null,
    created_at: PREVIEW_TIMESTAMP,
    updated_at: PREVIEW_TIMESTAMP,
    user_id: 'preview',
    quantity_limit: vm.qty,
    store: vm.store,
  };
}
