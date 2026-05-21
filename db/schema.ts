import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import type { AdapterAccountType } from 'next-auth/adapters';

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  last_seen_following_at: timestamp('last_seen_following_at'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const lists = pgTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subtitle: text('subtitle'),
  occasion: text('occasion').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  // Legacy column — dormant during soak (see openspec change add-following-and-history,
  // design Decision 4b). Removed in follow-up archive-legacy-share. Dev code reads
  // `visibility` only; `shared` is dual-written by setListVisibility for main compat.
  shared: boolean('shared').default(false).notNull(),
  visibility: text('visibility').notNull().default('private'),
  shared_at: timestamp('shared_at'),
});

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  image_url: text('image_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  quantity_limit: integer('quantity_limit').default(1),
  archived_at: timestamp('archived_at'),
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
  (table) => [primaryKey({ columns: [table.list_id, table.item_id] })]
);

// Legacy table — dormant during soak (see openspec change add-following-and-history,
// design Decision 4a). Replaced by list_visits. Removed in follow-up archive-legacy-share.
export const saved_lists = pgTable('saved_lists', {
  id: text('id').primaryKey(),
  list_id: text('list_id')
    .references(() => lists.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
});

export const list_visits = pgTable(
  'list_visits',
  {
    user_id: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    list_id: text('list_id')
      .references(() => lists.id, { onDelete: 'cascade' })
      .notNull(),
    last_visited_at: timestamp('last_visited_at').defaultNow(),
    visit_count: integer('visit_count').notNull().default(1),
    favorited_at: timestamp('favorited_at'),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.list_id] })]
);

export const user_follows = pgTable(
  'user_follows',
  {
    follower_id: text('follower_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    followee_id: text('followee_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.follower_id, table.followee_id] })]
);

export const user_blocks = pgTable(
  'user_blocks',
  {
    blocker_id: text('blocker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    blocked_id: text('blocked_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.blocker_id, table.blocked_id] })]
);

export const item_stores = pgTable('item_stores', {
  id: text('id').primaryKey(),
  item_id: text('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  link: text('link').notNull(),
  price: text('price').notNull(),
  order: integer('order').notNull().default(1),
});

export const purchases = pgTable(
  'purchases',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: text('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    guest_name: text('guest_name'),
    purchased_at: timestamp('purchased_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchases_item_user_unique_idx')
      .on(table.item_id, table.user_id)
      .where(sql`${table.user_id} IS NOT NULL`),
  ]
);

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
  user: one(users, {
    fields: [purchases.user_id],
    references: [users.id],
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
  visits: many(list_visits),
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
  visits: many(list_visits),
  following: many(user_follows, { relationName: 'follower' }),
  followers: many(user_follows, { relationName: 'followee' }),
  blocking: many(user_blocks, { relationName: 'blocker' }),
  blockedBy: many(user_blocks, { relationName: 'blocked' }),
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

export const list_visitsRelations = relations(list_visits, ({ one }) => ({
  user: one(users, {
    fields: [list_visits.user_id],
    references: [users.id],
  }),
  list: one(lists, {
    fields: [list_visits.list_id],
    references: [lists.id],
  }),
}));

export const user_followsRelations = relations(user_follows, ({ one }) => ({
  follower: one(users, {
    fields: [user_follows.follower_id],
    references: [users.id],
    relationName: 'follower',
  }),
  followee: one(users, {
    fields: [user_follows.followee_id],
    references: [users.id],
    relationName: 'followee',
  }),
}));

export const user_blocksRelations = relations(user_blocks, ({ one }) => ({
  blocker: one(users, {
    fields: [user_blocks.blocker_id],
    references: [users.id],
    relationName: 'blocker',
  }),
  blocked: one(users, {
    fields: [user_blocks.blocked_id],
    references: [users.id],
    relationName: 'blocked',
  }),
}));
