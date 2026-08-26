import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  primaryKey,
  serial,
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
  profile_id: text('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  updated_by_user_id: text('updated_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
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
  profile_id: text('profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  updated_by_user_id: text('updated_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
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
    followee_profile_id: text('followee_profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.follower_id, table.followee_profile_id] }),
  ]
);

export const user_blocks = pgTable(
  'user_blocks',
  {
    blocker_profile_id: text('blocker_profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    blocked_profile_id: text('blocked_profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.blocker_profile_id, table.blocked_profile_id],
    }),
  ]
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
  price_fetched_at: timestamp('price_fetched_at'),
  canonical_url: text('canonical_url'),
  currency: text('currency'),
});

export const item_images = pgTable(
  'item_images',
  {
    id: serial('id').primaryKey(),
    item_id: text('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    url: text('url').notNull(),
    // Marks the item's active image; the partial-unique index below is the
    // no-transactions backstop for concurrent guest-callable mints.
    active: boolean('active').notNull().default(false),
  },
  (table) => [
    uniqueIndex('item_images_one_active_idx')
      .on(table.item_id)
      .where(sql`${table.active}`),
  ]
);

export const purchases = pgTable(
  'purchases',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    profile_id: text('profile_id').references(() => profiles.id, {
      onDelete: 'cascade',
    }),
    claimed_by_profile_id: text('claimed_by_profile_id').references(
      () => profiles.id,
      { onDelete: 'set null' }
    ),
    guest_name: text('guest_name'),
    purchased_at: timestamp('purchased_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchases_item_profile_unique_idx')
      .on(table.item_id, table.profile_id)
      .where(sql`${table.profile_id} IS NOT NULL`),
  ]
);

export const profiles = pgTable('profiles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  tagline: text('tagline'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Named so `createSelfProfile` can narrow its 23505 catch to the violation it
// treats as success; a bare code would swallow unrelated ones.
export const SELF_MEMBERSHIP_PER_USER_IDX =
  'profile_members_one_self_per_user_idx';
export const SELF_MEMBERSHIP_PER_PROFILE_IDX =
  'profile_members_one_self_per_profile_idx';

export const profile_members = pgTable(
  'profile_members',
  {
    user_id: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    profile_id: text('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(),
    ride_along: boolean('ride_along').notNull().default(false),
    last_active_at: timestamp('last_active_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.profile_id] }),
    check(
      'profile_members_role_valid',
      sql`${table.role} IN ('self', 'owner', 'manager')`
    ),
    // Both directions are load-bearing: the account side is "one self-profile
    // per account", the profile side is what makes a claim asserter resolve
    // back to exactly one human.
    uniqueIndex(SELF_MEMBERSHIP_PER_USER_IDX)
      .on(table.user_id)
      .where(sql`${table.role} = 'self'`),
    uniqueIndex(SELF_MEMBERSHIP_PER_PROFILE_IDX)
      .on(table.profile_id)
      .where(sql`${table.role} = 'self'`),
  ]
);

// The catalog row 0013 inserts. Named so writers and reads agree on the key
// rather than each spelling the literal.
export const ACCENT_PREFERENCE_ID = 'accent';

export const preferences = pgTable('preferences', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
});

export const profile_preferences = pgTable(
  'profile_preferences',
  {
    profile_id: text('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    preference_id: text('preference_id')
      .references(() => preferences.id, { onDelete: 'cascade' })
      .notNull(),
    value: text('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.profile_id, table.preference_id] })]
);

// Relations between tables
export const item_storesRelations = relations(item_stores, ({ one }) => ({
  item: one(items, {
    fields: [item_stores.item_id],
    references: [items.id],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [items.profile_id],
    references: [profiles.id],
    relationName: 'itemOwnerProfile',
  }),
  updatedBy: one(users, {
    fields: [items.updated_by_user_id],
    references: [users.id],
    relationName: 'itemUpdatedBy',
  }),
  purchases: many(purchases),
  stores: many(item_stores),
  list_items: many(list_items),
  images: many(item_images),
}));

export const item_imagesRelations = relations(item_images, ({ one }) => ({
  item: one(items, {
    fields: [item_images.item_id],
    references: [items.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  item: one(items, {
    fields: [purchases.item_id],
    references: [items.id],
  }),
  purchaserProfile: one(profiles, {
    fields: [purchases.profile_id],
    references: [profiles.id],
    relationName: 'purchaserProfile',
  }),
  claimerProfile: one(profiles, {
    fields: [purchases.claimed_by_profile_id],
    references: [profiles.id],
    relationName: 'claimerProfile',
  }),
}));

// Relations between tables
export const listsRelations = relations(lists, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [lists.profile_id],
    references: [profiles.id],
    relationName: 'listOwnerProfile',
  }),
  updatedBy: one(users, {
    fields: [lists.updated_by_user_id],
    references: [users.id],
    relationName: 'listUpdatedBy',
  }),
  items: many(list_items),
  visits: many(list_visits),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(profile_members),
  visits: many(list_visits),
  following: many(user_follows, { relationName: 'follower' }),
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
  followeeProfile: one(profiles, {
    fields: [user_follows.followee_profile_id],
    references: [profiles.id],
    relationName: 'followeeProfile',
  }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  members: many(profile_members),
  preferences: many(profile_preferences),
  lists: many(lists, { relationName: 'listOwnerProfile' }),
  items: many(items, { relationName: 'itemOwnerProfile' }),
}));

export const profile_membersRelations = relations(
  profile_members,
  ({ one }) => ({
    user: one(users, {
      fields: [profile_members.user_id],
      references: [users.id],
    }),
    profile: one(profiles, {
      fields: [profile_members.profile_id],
      references: [profiles.id],
    }),
  })
);

export const preferencesRelations = relations(preferences, ({ many }) => ({
  values: many(profile_preferences),
}));

export const profile_preferencesRelations = relations(
  profile_preferences,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profile_preferences.profile_id],
      references: [profiles.id],
    }),
    preference: one(preferences, {
      fields: [profile_preferences.preference_id],
      references: [preferences.id],
    }),
  })
);
