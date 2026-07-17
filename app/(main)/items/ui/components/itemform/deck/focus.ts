// `title` is the legacy step id for the item-name field. The full title→name
// rename is deferred to its own change (design.md D15), so the key stays
// `title` while the label it maps to is the user-facing "Item name".
export type FocusField = 'photo' | 'title' | 'price' | 'note';

/** Every field row: the per-field Focus editors plus the grouped store row. */
export type RowField = FocusField | 'store';

export const ROW_LABELS: Record<RowField, string> = {
  photo: 'Photo',
  title: 'Item name',
  price: 'Price',
  note: 'Note',
  store: 'Store',
};
