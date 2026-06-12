import { describe, expect, it } from 'vitest';
import { sqlstateOf } from '../sqlstate';

describe('sqlstateOf', () => {
  it('DirectStringCode_ReturnsCode', () => {
    expect(sqlstateOf({ code: '23505' })).toBe('23505');
  });

  it('NestedCauseStringCode_ReturnsCauseCode', () => {
    expect(sqlstateOf({ cause: { code: '23505' } })).toBe('23505');
  });

  it('BothDirectAndCauseCode_PrefersDirect', () => {
    expect(sqlstateOf({ code: '23505', cause: { code: '99999' } })).toBe(
      '23505'
    );
  });

  it('ObjectWithoutCodeOrCause_ReturnsUndefined', () => {
    expect(sqlstateOf({ unrelated: true })).toBeUndefined();
  });

  it('NullInput_ReturnsUndefined', () => {
    expect(sqlstateOf(null)).toBeUndefined();
  });

  it('UndefinedInput_ReturnsUndefined', () => {
    expect(sqlstateOf(undefined)).toBeUndefined();
  });

  it('StringInput_ReturnsUndefined', () => {
    expect(sqlstateOf('23505')).toBeUndefined();
  });

  it('NumberInput_ReturnsUndefined', () => {
    expect(sqlstateOf(42)).toBeUndefined();
  });

  it('DirectNonStringCode_FallsThroughToCause', () => {
    expect(sqlstateOf({ code: 23505, cause: { code: '99999' } })).toBe(
      '99999'
    );
  });

  it('CauseWithNonStringCode_ReturnsUndefined', () => {
    expect(sqlstateOf({ cause: { code: 23505 } })).toBeUndefined();
  });

  it('CauseObjectWithoutCode_ReturnsUndefined', () => {
    expect(sqlstateOf({ cause: {} })).toBeUndefined();
  });
});
