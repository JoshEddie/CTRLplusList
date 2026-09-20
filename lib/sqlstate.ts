function stringFieldOf(err: unknown, key: string): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const direct = (err as Record<string, unknown>)[key];
  if (typeof direct === 'string') return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause !== 'object' || cause === null) return undefined;
  const nested = (cause as Record<string, unknown>)[key];
  return typeof nested === 'string' ? nested : undefined;
}

// The violated index's name, not a constraint name: a partial unique index has
// no pg_constraint row, so the driver reports it under `constraint` regardless.
export function constraintOf(err: unknown): string | undefined {
  return stringFieldOf(err, 'constraint');
}

export function sqlstateOf(err: unknown): string | undefined {
  return stringFieldOf(err, 'code');
}
