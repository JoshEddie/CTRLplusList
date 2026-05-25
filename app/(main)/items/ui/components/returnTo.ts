export function sanitizeReturnTo(
  value: string | null | undefined
): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  if (!value.startsWith('/')) return undefined;
  if (value.startsWith('//')) return undefined;
  if (value.includes('://')) return undefined;
  if (value.includes('\\')) return undefined;
  return value;
}
