export interface StoreFields {
  name: string;
  link: string;
  price: string;
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
