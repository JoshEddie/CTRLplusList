import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})
 
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

export const lists = pgTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  occasion: text('occasion').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  shared: boolean('shared').default(false).notNull(),
});

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  image_url: text('image_url').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  quantity_limit: integer('quantity_limit').default(1).notNull(),
});

export const list_items = pgTable(
  'list_items',
  {
    list_id: text('list_id')
      .references(() => lists.id, { onDelete: 'cascade' })
      .notNull(),
    item_id: text('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.list_id, table.item_id] }),
  ]
);

export const saved_lists = pgTable('saved_lists', {
  id: text('id').primaryKey(),
  list_id: text('list_id')
    .references(() => lists.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
});

export const item_stores = pgTable('item_stores', {
  id: text('id').primaryKey(),
  item_id: text('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  link: text('link').notNull(),
  price: text('price').notNull(),
});

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey(),
  item_id: text('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // Made optional
  guest_name: text('guest_name'), // For guest purchases
  purchased_at: timestamp('purchased_at').defaultNow().notNull(),
});

// Relations between tables
export const item_storesRelations = relations(item_stores, ({ one }) => ({
  item: one(items, {
    fields: [item_stores.item_id],
    references: [items.id],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.user_id],
    references: [users.id],
  }),
  purchases: many(purchases),
  stores: many(item_stores),
  list_items: many(list_items),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  item: one(items, {
    fields: [purchases.item_id],
    references: [items.id],
  }),
}));

// Relations between tables
export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, {
    fields: [lists.user_id],
    references: [users.id],
  }),
  items: many(list_items),
  saved_lists: many(saved_lists),
}));

export const saved_listsRelations = relations(saved_lists, ({ one }) => ({
  list: one(lists, {
    fields: [saved_lists.list_id],
    references: [lists.id],
  }),
  user: one(users, {
    fields: [saved_lists.user_id],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  items: many(items),
  purchases: many(purchases),
  saved_lists: many(saved_lists),
}));

export const list_itemsRelations = relations(list_items, ({ one }) => ({
  list: one(lists, {
    fields: [list_items.list_id],
    references: [lists.id],
  }),
  item: one(items, {
    fields: [list_items.item_id],
    references: [items.id],
  }),
}));
