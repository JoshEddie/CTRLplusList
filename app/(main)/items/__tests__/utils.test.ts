import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizePageSize, readItemsPageSize, viewerDisplayName } from '../utils';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

function mockCookie(value: string | undefined): void {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === 'items_page_size' && value !== undefined ? { value } : undefined,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizePageSize', () => {
  it('ValidOption_ReturnsParsedNumber', () => {
    expect(normalizePageSize('12')).toBe(12);
    expect(normalizePageSize('48')).toBe(48);
    expect(normalizePageSize('96')).toBe(96);
  });

  it('OffListValue_ReturnsDefault', () => {
    expect(normalizePageSize('7')).toBe(24);
  });

  it('NonNumericValue_ReturnsDefault', () => {
    expect(normalizePageSize('abc')).toBe(24);
  });

  it('AbsentValue_ReturnsDefault', () => {
    expect(normalizePageSize(undefined)).toBe(24);
    expect(normalizePageSize(null)).toBe(24);
  });
});

describe('readItemsPageSize', () => {
  it('ValidCookie_ReturnsNormalizedSize', async () => {
    mockCookie('48');
    await expect(readItemsPageSize()).resolves.toBe(48);
  });

  it('OffListCookie_ReturnsDefault', async () => {
    mockCookie('7');
    await expect(readItemsPageSize()).resolves.toBe(24);
  });

  it('AbsentCookie_ReturnsDefault', async () => {
    mockCookie(undefined);
    await expect(readItemsPageSize()).resolves.toBe(24);
  });
});

describe('viewerDisplayName', () => {
  it('TwoTokenName_ReturnsFirstAndLastInitial', () => {
    expect(viewerDisplayName('Test Viewer')).toBe('Test V');
  });

  it('MultiTokenName_UsesFirstTwoTokens', () => {
    expect(viewerDisplayName('Ada B Lovelace')).toBe('Ada B');
  });

  it('SingleTokenName_ReturnsToken', () => {
    expect(viewerDisplayName('Madonna')).toBe('Madonna');
  });

  it('EmptyOrNullName_ReturnsUndefined', () => {
    expect(viewerDisplayName('')).toBeUndefined();
    expect(viewerDisplayName(null)).toBeUndefined();
    expect(viewerDisplayName(undefined)).toBeUndefined();
  });
});
