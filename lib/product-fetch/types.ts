export type ProductData = {
  title: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  canonicalUrl?: string;
  store: string;
};

export type ProductFetchError = 'fetch_failed' | 'invalid_url' | 'timeout';

export type ProductResult =
  | { ok: true; product: ProductData }
  | { ok: false; error: ProductFetchError };

/** Partial extraction from a single tier, before store-name derivation. */
export type ExtractedProduct = {
  title?: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  canonicalUrl?: string;
  finalUrl?: string;
};
