export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
  id?: string;
};

export type ListTable = {
  id: string;
  name: string;
  subtitle: string | null;
  occasion: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  shared: boolean;
};

export type UserTable = {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
};

export type ItemTable = {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  quantity_limit: number | null;
  archived_at?: Date | null;
};

export type PurchaseView = {
  id: string;
  by: 'self' | 'other';
  firstName: string;
  /** The viewer asserted this claim (`claimed_by`) — grants the unclaim affordance even when the purchaser is someone else. */
  claimedByViewer: boolean;
  /** Owner spoiler view only: the claimer's first name when the claimer differs from the purchaser. */
  claimerFirstName?: string;
};

export type ItemDisplay = ItemTable & {
  stores?: ItemStoreTable[];
  purchases?: PurchaseView[];
  hasPurchases?: boolean;
};

export type SortKey =
  | 'list_order'
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'store_asc'
  | 'store_desc'
  | 'price_asc'
  | 'price_desc';

export type ItemDetails = {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
  /** Fetched image-candidate pool; present only when the form session originated from a product fetch. */
  image_candidates?: string[];
  quantity_limit: number | null;
  stores: ItemStoreTable[];
  lists: OptionType[];
};

export type ListItemTable = {
  list_id: string;
  item_id: string;
  position: number;
};

export type ItemStoreTable = {
  name: string;
  link: string;
  price: string;
  /** Automated price-fetch capture time (Date from the DB, ISO string from the client); null/absent for manual rows. */
  price_fetched_at?: Date | string | null;
  canonical_url?: string | null;
  currency?: string | null;
};

export type PurchaseTable = {
  id: string;
  item_id: string;
  user_id: string | null;
  claimed_by: string | null;
  guest_name: string | null;
  purchased_at: Date;
  user: { name: string | null } | null;
};

export type OptionType = {
  value: string;
  label: string;
};

export interface ImageSearchResult {
  link: string;
  title: string;
  image: {
    byteSize: number;
    contextLink: string;
    height: number;
    thumbnailLink: string;
    width: number;
  };
}
