export interface StoreFields {
  name: string;
  link: string;
  price: string;
}

export function isValidProductUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function priceAsOf(fetchedAt: Date | string | null | undefined) {
  if (!fetchedAt) return null;
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `price as of ${date.toLocaleDateString()}`;
}

export function isValidHttpUrl(url: string): { url: string; error?: string } {
  if (!url.match(/^https?:\/\//i)) {
    return { url, error: 'http:// is missing' };
  }
  try {
    return { url: new URL(url).toString() };
  } catch (e) {
    console.error(e);
    return {
      url,
      error: 'Please verify the link (i.e. https://example.com)',
    };
  }
}

// Mirrors ItemSchema's name bounds (lib/data/item.schema.ts) so the client
// surfaces the same error the server would return.
export function itemNameError(value: string | number | null | undefined): string {
  const name = value?.toString() ?? '';
  if (!name) return 'Name is required';
  if (name.length < 3) return 'Title must be at least 3 characters';
  if (name.length > 100) return 'Title must be less than 100 characters';
  return '';
}

export function storeNameError(value: string | number, store: StoreFields): string {
  if (!value && (store.link || store.price)) {
    return 'Store name required when price or link is added';
  }
  return '';
}

export function storePriceError(value: string | number, store: StoreFields): string {
  if (value && !value.toString().match(/^\$?[0-9]+(\.[0-9][0-9]?)?$/)) {
    return 'Invalid price format 00.00';
  }
  if (!value && (store.name || store.link)) {
    return 'Price is required when store name and/or link is provided';
  }
  return '';
}

export function storeLinkError(value: string | number, store: StoreFields): string {
  if (value) {
    const formatted = isValidHttpUrl(value.toString());
    return formatted.error ? `Invalid URL: ${formatted.error}` : '';
  }
  if (store.name || store.price) {
    return 'Link is required when store name and/or price is provided';
  }
  return '';
}
