import { afterEach, describe, expect, it, vi } from 'vitest';

// The four driver constructors are mocked so each test can assert WHICH driver
// `db/index.ts` selected (the observable branch), not merely that the module
// imported without throwing. Each factory returns a sentinel the test reads off
// the exported `db`.
const neonDrizzle = vi.fn(() => ({ driver: 'neon' }));
const pgDrizzle = vi.fn(() => ({ driver: 'postgres-js' }));
const neonClient = vi.fn((url: string) => ({ neonClientFor: url }));
const pgClient = vi.fn((url: string) => ({ pgClientFor: url }));

vi.mock('drizzle-orm/neon-http', () => ({ drizzle: neonDrizzle }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: pgDrizzle }));
vi.mock('@neondatabase/serverless', () => ({ neon: neonClient }));
vi.mock('postgres', () => ({ default: pgClient }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe('dbDriverSwitch', () => {
  it('FlagSetWithNonLocalhostUrl_ThrowsBeforeConnecting', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@db.example.com:5432/prod');

    await expect(import('../index')).rejects.toThrow(/localhost/i);
    expect(pgClient).not.toHaveBeenCalled();
    expect(neonClient).not.toHaveBeenCalled();
  });

  it('FlagSetWithLocalhostSubstringHost_ThrowsBeforeConnecting', async () => {
    // The host merely contains `localhost` — a substring match would wrongly
    // pass; the guard checks the parsed hostname exactly, so this is rejected.
    vi.stubEnv('USE_PG_DRIVER', '1');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost.attacker.com:5432/db');

    await expect(import('../index')).rejects.toThrow(/localhost/i);
    expect(pgClient).not.toHaveBeenCalled();
    expect(neonClient).not.toHaveBeenCalled();
  });

  it('FlagSetWithLocalhostUrl_SelectsPostgresJsDriver', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost:5434/test?sslmode=disable');

    const mod = await import('../index');

    expect(pgClient).toHaveBeenCalledWith(
      'postgresql://u:p@localhost:5434/test?sslmode=disable'
    );
    expect(pgDrizzle).toHaveBeenCalledTimes(1);
    expect(neonDrizzle).not.toHaveBeenCalled();
    expect(mod.db).toEqual({ driver: 'postgres-js' });
  });

  it('FlagUnset_SelectsNeonHttpDriver', async () => {
    vi.stubEnv('USE_PG_DRIVER', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@ep-prod.neon.tech/main');

    const mod = await import('../index');

    expect(neonClient).toHaveBeenCalledWith(
      'postgresql://u:p@ep-prod.neon.tech/main'
    );
    expect(neonDrizzle).toHaveBeenCalledTimes(1);
    expect(pgDrizzle).not.toHaveBeenCalled();
    expect(mod.db).toEqual({ driver: 'neon' });
  });
});
