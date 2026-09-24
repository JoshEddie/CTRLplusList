import { getMessage } from '@/lib/i18n/utils';
import type { ListTable } from '@/lib/types';
import { toast } from 'react-hot-toast';

export const COMMON_OCCASIONS = [
  'Birthday',
  'Christmas',
  'Wedding',
  'Anniversary',
  'Baby Shower',
  'Graduation',
];

// The <input type="date"> min of 1900-01-01 only bounds the picker; a typed
// year still reaches the value, and a two-digit one parses to a year under 1000.
export function dateFieldError(dateString: string): string | null {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return getMessage('date_invalid');
  if (date.getFullYear() < 1000) return getMessage('date_year_floor');
  return null;
}

export function dateInputValue(date: Date | string): string {
  return new Date(date).toISOString().split('T')[0];
}

export interface ListDetailsDraft {
  name: string;
  subtitle: string;
  occasion: string;
  date: string;
}

// A blank subtitle is stored as NULL, so the draft's empty string and the
// row's null are the same value and must not read as an edit.
export function detailsChanged(
  draft: ListDetailsDraft,
  saved: { name: string; subtitle: string | null; occasion: string; date: Date }
): boolean {
  const subtitle = draft.subtitle.trim();
  return (
    draft.name !== saved.name ||
    (subtitle === '' ? null : subtitle) !== saved.subtitle ||
    draft.occasion !== saved.occasion ||
    draft.date !== dateInputValue(saved.date)
  );
}

// Built from list.id rather than window.location, so no presentation-state
// params ever reach the shared URL.
export async function shareList(list: ListTable) {
  const listUrl = `https://www.ctrlpluslist.com/lists/${list.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: list.name, url: listUrl });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to share list');
      }
    }
    return;
  }
  try {
    await toast.promise(navigator.clipboard.writeText(listUrl), {
      loading: 'Copying',
      success: 'Copied to clipboard',
      error: 'Failed to copy URL to clipboard',
    });
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}
