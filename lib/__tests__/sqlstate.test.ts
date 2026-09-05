import { describe, expect, it } from 'vitest';
import { constraintOf, sqlstateOf } from '../sqlstate';

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

describe('constraintOf', () => {
  it('DirectConstraintName_ReturnsName', () => {
    expect(constraintOf({ constraint: 'some_idx' })).toBe('some_idx');
  });

  it('NestedCauseConstraintName_ReturnsCauseName', () => {
    expect(constraintOf({ cause: { constraint: 'some_idx' } })).toBe(
      'some_idx'
    );
  });

  it('BothDirectAndCauseConstraint_PrefersDirect', () => {
    expect(
      constraintOf({ constraint: 'direct_idx', cause: { constraint: 'x' } })
    ).toBe('direct_idx');
  });

  it('DirectNonStringConstraint_FallsThroughToCause', () => {
    expect(
      constraintOf({ constraint: 42, cause: { constraint: 'cause_idx' } })
    ).toBe('cause_idx');
  });

  it('CauseWithNonStringConstraint_ReturnsUndefined', () => {
    expect(constraintOf({ cause: { constraint: 42 } })).toBeUndefined();
  });

  it('ObjectWithoutConstraintOrCause_ReturnsUndefined', () => {
    expect(constraintOf({ unrelated: true })).toBeUndefined();
  });

  it('NullInput_ReturnsUndefined', () => {
    expect(constraintOf(null)).toBeUndefined();
  });

  it('StringInput_ReturnsUndefined', () => {
    expect(constraintOf('some_idx')).toBeUndefined();
  });
});
