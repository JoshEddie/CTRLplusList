import { getMessage } from '@/lib/i18n/utils';

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
