import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../paginationConstants';

describe('paginationConstants', () => {
  it('Constants_LockPageSizeContract', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(24);
    expect([...PAGE_SIZE_OPTIONS]).toEqual([12, 24, 48, 96]);
  });
});
