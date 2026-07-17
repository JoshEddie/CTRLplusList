export type Screen =
  | 'start'
  | 'fetching'
  | 'deck'
  | 'preview'
  | 'triage'
  | 'manual'
  | 'failure';

export type Sheet = 'stores' | 'lists';

export function isValidProductUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
