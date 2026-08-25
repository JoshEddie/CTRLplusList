// Relative-time helper. Returns "just now", "2 days ago", "3 weeks ago", etc.
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2592000, 'month'],
    [31536000, 'year'],
  ];
  // diffSec is ≥ 60 here (the just-now return handled anything smaller), so
  // findLast always matches at least the minute threshold.
  const [seconds, unit] = units.findLast(
    ([threshold]) => diffSec >= threshold
  )!;
  return rtf.format(-Math.round(diffSec / seconds), unit);
}
