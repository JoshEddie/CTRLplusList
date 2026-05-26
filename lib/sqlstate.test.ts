import { describe, expect, it } from 'vitest';
import { sqlstateOf } from './sqlstate';

describe('sqlstateOf', () => {
  it('reads .code first', () => {
    expect(sqlstateOf({ code: '23505' })).toBe('23505');
  });

  it('falls back to .cause.code', () => {
    expect(sqlstateOf({ cause: { code: '23505' } })).toBe('23505');
  });

  it('prefers .code over .cause.code when both exist', () => {
    expect(sqlstateOf({ code: '23505', cause: { code: '99999' } })).toBe(
      '23505'
    );
  });

  it('returns undefined for unrelated values', () => {
    expect(sqlstateOf({ unrelated: true })).toBeUndefined();
  });
});
