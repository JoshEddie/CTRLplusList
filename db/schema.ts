import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const lists = pgTable('lists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  occasion: text('occasion').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id)
    .notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  image_url: text('image_url').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id)
    .notNull(),
  quantity_limit: integer('quantity_limit').default(1).notNull(),
});

export const list_items = pgTable(
  'list_items',
  {
    list_id: integer('list_id')
      .references(() => lists.id, { onDelete: 'cascade' })
      .notNull(),
    item_id: integer('item_id')
      .references(() => items.id)
      .notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.list_id, table.item_id] }),
  })
);

export const item_stores = pgTable('item_stores', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id')
    .references(() => items.id)
    .notNull(),
  name: text('name').notNull(),
  link: text('link').notNull(),
  price: text('price').notNull(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id')
    .references(() => items.id)
    .notNull(),
  user_id: text('user_id').references(() => users.id), // Made optional
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
}));

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  items: many(items),
  purchases: many(purchases),
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
