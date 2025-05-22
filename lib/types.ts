export type ListTable = {
  id: string;
  name: string;
  occasion: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
  user_id: string;
};

export type UserTable = {
  id: string;
  email: string;
  name: string;
  password: string;
};

export type ItemTable = {
  id: string;
  name: string;
  image_url: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  quantity_limit: number;
};

export type ItemDetails = {
  id: string;
  name: string;
  image_url: string;
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
  user_id: string;
  guest_name: string;
  purchased_at: Date;
};

export type OptionType = {
  value: string;
  label: string;
};
