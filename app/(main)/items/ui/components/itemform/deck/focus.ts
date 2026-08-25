export type FocusField = 'photo' | 'name' | 'price' | 'note';

/** Every field row: the per-field Focus editors plus the grouped store row. */
export type RowField = FocusField | 'store';

export const ROW_LABELS: Record<RowField, string> = {
  photo: 'Photo',
  name: 'Item name',
  price: 'Price',
  note: 'Note',
  store: 'Store',
};
