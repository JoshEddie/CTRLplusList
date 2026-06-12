import { afterEach, describe, expect, it, vi } from 'vitest';
import DevErrorPage from '../page';

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  })
);
vi.mock('next/navigation', () => ({ notFound }));

describe('DevErrorPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it('LocalMode_ThrowsIntentionalVerificationError', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');
    await expect(DevErrorPage()).rejects.toThrow(
      'intentional boundary-verification error'
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it('FlagUnset_CallsNotFound', async () => {
    vi.stubEnv('USE_PG_DRIVER', '');
    await expect(DevErrorPage()).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404'
    );
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
