export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
  id?: string;
};

// `isSelf` is why grantability carries no field of its own: a link admits a
// member, and the identity relation is not a membership anyone can hand out.
// The records live in `lib/data/profile.roles`.
export type RoleShape = {
  value: string;
  label: string;
  isSelf: boolean;
  admin: boolean;
};

// What the one avatar disc needs, and nothing more: the art where the profile
// has any, the style that art was drawn in (a glyph style is painted from the
// accent's ink rather than shown), the name its initials fall back to, and the
// accent behind both. No account column is among them.
export type ProfileAvatarView = {
  name: string;
  accent: string | null;
  art: string | null;
  avatarStyle: string | null;
};

export type ActorProfile = ProfileAvatarView & {
  id: string;
};

export type ProfileMembershipView = ActorProfile & {
  tagline: string | null;
  role: RoleShape;
  last_active_at: Date | null;
};

// The two profiles a request names, never one. Ownership columns and creation
// take the active profile; anything naming the human takes the self-profile.
// The active one is the membership `resolveIdentity` selected, role included,
// so every affordance measured against that role reads it off the identity
// rather than re-resolving it.
export type UserIdentity = {
  userId: string;
  selfProfile: ActorProfile;
  activeProfile: ProfileMembershipView;
};

export type ListTable = {
  id: string;
  name: string;
  subtitle: string | null;
  occasion: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
  profile_id: string;
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
  profile_id: string;
  quantity_limit: number | null;
  archived_at?: Date | null;
};

export type ProfileCardView = ProfileAvatarView & {
  id: string;
  tagline: string | null;
  role: RoleShape;
  listCount: number;
  itemCount: number;
};

/**
 * What a viewer sees before they ask: a single three-stage tier, weakest
 * first. `surprise` hides everything; `progress` adds the list's claimed
 * count; `claims` adds per-item badges and remaining capacity. No tier names
 * the claiming parties — that is a per-act reveal the viewer confirms in the
 * claim modal. Ordering and vocabulary live in `lib/spoilers.ts`.
 */
export type SpoilerTier = 'surprise' | 'progress' | 'claims';

export type PurchaseView = {
  id: string;
  by: 'self' | 'other';
  /** Absent on another party's claim, which every tier discloses as a bare count; present only on the viewer's own claims and on a confirmed reveal. */
  name?: string;
  /** The viewer asserted this claim (`claimed_by_profile_id`) — grants the unclaim affordance even when the purchaser is someone else. */
  claimedByViewer: boolean;
  /** The claimer's first name when the claimer differs from the purchaser. */
  claimerName?: string;
  /** Absent only on legacy fixtures — every persisted row carries it; optimistic rows stamp client time. */
  purchasedAt?: Date;
  /** The purchaser profile's own face, where the purchaser is a profile. Absent for a free-text purchaser and on optimistic rows, both of which render initials. Account linkage does not govern it: a managed profile carries a face on the same terms as anyone else. */
  avatar?: ProfileAvatarView;
};

export type ItemDisplay = ItemTable & {
  store?: ItemStoreTable | null;
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
  store: ItemStoreTable | null;
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
  profile_id: string | null;
  claimed_by_profile_id: string | null;
  guest_name: string | null;
  purchased_at: Date;
  purchaserProfile: { name: string | null } | null;
};

export type OptionType = {
  value: string;
  label: string;
};

// The primitive decides neither when a secondary action is warranted nor what
// it says — it renders what its consumer supplies. Which profile-scoped
// surfaces supply one, and under what condition, is `active-profile`'s.
export type EmptySecondaryAction = { href: string; label: string };
