export function capRail<T>(
  all: T[],
  limit = 5
): { shown: T[]; moreCount: number } {
  const shown = all.slice(0, limit);
  return { shown, moreCount: Math.max(0, all.length - shown.length) };
}
