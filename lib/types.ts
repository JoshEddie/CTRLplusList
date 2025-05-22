export type ListTable = {
  id: number;
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
  id: number;
  name: string;
  image_url: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  quantity_limit: number;
};

export type ItemDetails = {
  id: number;
  name: string;
  image_url: string;
  quantity_limit: number;
  user_id: string;
  stores: ItemStoreTable[];
  lists: OptionType[];
};

export type ListItemTable = {
  list_id: number;
  item_id: number;
  position: number;
};

export type ItemStoreTable = {
  name: string;
  link: string;
  price: string;
};

export type PurchaseTable = {
  id: number;
  item_id: number;
  user_id: string;
  guest_name: string;
  purchased_at: Date;
};

export type OptionType = {
  value: string;
  label: string;
};

// export type NameId = {
//     id: string;
//     name: string;
// }

// export type CreatedUpdatedDate = {
//     created_at: Date;
//     updated_at: Date;
// }

// export type List = NameId & {
//     occasion: string;
//     date: Date;
//     user_id: string;
// }

// export type User = NameId & {
//     email: string;
//     password: string;
// }

// export type Item = NameId & {
//     image_url: string;
//     quantity_limit: number | null;
//     user_id: string;
// }

// export type Store = {
//     id?: string;
//     name: string;
//     link: string;
//     price: string;
// }

// export type Purchase = {
//     id: string;
//     item_id: string;
//     user_id: string | null;
//     guest_name: string | null;
//     purchased_at: Date;
// }

// export type OptionType = {
//     value: string;
//     label: string;
// }

// export type LinkProps = {
//     linkText: string;
//     linkHref: string;
// }

// export type Stores = {
//     id: string;
//     name: string;
//     link: string;
//     price: string;
// }

// export type Items = {
//     id: string;
//     name: string;
//     image_url: string;
//     quantity_limit: number | null;
//     user_id: string;
//     position: number;
//     created_at: Date;
//     updated_at: Date;
//     stores: Stores[];
// }

// export type ItemWithLists = Item & {
//     stores: Store[]
//     lists: NameId[]
// }
