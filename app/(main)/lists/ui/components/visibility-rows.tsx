import { VISIBILITY, type ListVisibility } from '@/lib/visibility';
import { FaLink, FaLock, FaUsers } from 'react-icons/fa';

// Single source of truth for the three-row visibility menu rendered by
// both the `<VisibilityPicker>` popover (expanded hero) and the
// `<VisibilityMenuItems>` group inside the collapsed-hero kebab. Both
// surfaces show the same options, fire the same `setListVisibility`
// action, and surface the same toast — so the row table lives here once.

export type VisibilityRow = {
  value: ListVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
  toast: string;
};

export const VISIBILITY_ROWS: readonly VisibilityRow[] = [
  {
    value: VISIBILITY.OWNER,
    label: 'Hidden',
    description: 'Only you can see this list',
    icon: <FaLock aria-hidden />,
    toast: 'List is now hidden',
  },
  {
    value: VISIBILITY.LINK,
    label: 'Private',
    description: 'Only people with the link can view',
    icon: <FaLink aria-hidden />,
    toast: 'Only people with the link can view',
  },
  {
    value: VISIBILITY.FOLLOWERS,
    label: 'Shared',
    description: 'Anyone with the link — plus your followers see it in their feed',
    icon: <FaUsers aria-hidden />,
    toast: 'Shared — your followers can now find it',
  },
];

export function rowFor(v: ListVisibility): VisibilityRow {
  return VISIBILITY_ROWS.find((r) => r.value === v) ?? VISIBILITY_ROWS[0];
}
