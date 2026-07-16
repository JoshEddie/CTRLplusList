import { FOCUS_LABELS, type FocusField } from './deck/focus';

export type Screen =
  | 'start'
  | 'fetching'
  | 'deck'
  | 'preview'
  | 'triage'
  | 'manual'
  | 'failure';

export type Sheet = 'stores' | 'lists';

export function shellTitle(
  screen: Screen,
  sheet: Sheet | null,
  focus: FocusField | null,
  isEditing: boolean
): string {
  if (focus) return FOCUS_LABELS[focus];
  if (sheet === 'stores') return 'Store links';
  if (sheet === 'lists') return 'Lists & quantity';
  if (screen === 'triage') return 'Review';
  if (screen === 'preview') return isEditing ? 'Edit item' : 'Add an item';
  return 'Add an item';
}

export function isValidProductUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
