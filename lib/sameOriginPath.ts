// One home for the same-origin rule every unvalidated-redirect boundary
// applies: a destination taken from a caller — a query string, a form action's
// argument — before it reaches `redirect()`, `router.push()` or `redirectTo`.
//
// Judged against what URL parsing will make of the string, not against how it
// reads: tab, LF and CR are removed before a URL is parsed, so they are removed
// here first — `/\t/evil.com` parses as `//evil.com`. What remains must be a
// `/` followed by neither another `/` nor a backslash, since parsing folds a
// backslash to `/` at the start of a special-scheme path, and either one begins
// an authority. `://` and a backslash anywhere are refused beyond that, per
// `list-item-management`'s standing rule.
export function sameOriginPath(
  destination: string | null | undefined
): string | undefined {
  if (typeof destination !== 'string') return undefined;
  const parsed = destination.replace(/[\t\n\r]/g, '');
  if (!/^\/(?![/\\])/.test(parsed)) return undefined;
  if (parsed.includes('://') || parsed.includes('\\')) return undefined;
  return parsed;
}
