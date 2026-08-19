// The violated index's name, not a constraint name: a partial unique index has
// no pg_constraint row, so the driver reports it under `constraint` regardless.
export function constraintOf(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const direct = (err as { constraint?: unknown }).constraint;
  if (typeof direct === 'string') return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause !== 'object' || cause === null) return undefined;
  const nested = (cause as { constraint?: unknown }).constraint;
  return typeof nested === 'string' ? nested : undefined;
}

export function sqlstateOf(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const direct = (err as { code?: unknown }).code;
  if (typeof direct === 'string') return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause !== 'object' || cause === null) return undefined;
  const nested = (cause as { code?: unknown }).code;
  return typeof nested === 'string' ? nested : undefined;
}
