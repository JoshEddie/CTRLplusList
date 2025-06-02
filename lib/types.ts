export type ListTable = {
  id: string;
  name: string;
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
  image_url?: string | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  quantity_limit: number;
};

export type ItemDisplay = ItemTable & {
  stores?: ItemStoreTable[];
  purchase?: PurchaseTable | null;
};

export type ItemDetails = {
  id: string;
  name: string;
  image_url?: string | null;
  quantity_limit: number;
  user_id: string;
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
};

export type PurchaseTable = {
  id: string;
  item_id: string;
  user_id: string | null;
  guest_name: string | null;
  purchased_at: Date;
  user: { name: string | null; } | null;
};

export type OptionType = {
  value: string;
  label: string;
};
