import { describe, expect, it } from 'vitest';
import { initialsOf } from '../utils';

describe('initialsOf', () => {
  it('Null_ReturnsEmpty', () => {
    expect(initialsOf(null)).toBe('');
  });

  it('Undefined_ReturnsEmpty', () => {
    expect(initialsOf(undefined)).toBe('');
  });

  it('EmptyString_ReturnsEmpty', () => {
    expect(initialsOf('')).toBe('');
  });

  it('WhitespaceOnly_ReturnsEmpty', () => {
    expect(initialsOf('   ')).toBe('');
  });

  it('SingleName_ReturnsFirstInitialUppercased', () => {
    expect(initialsOf('alice')).toBe('A');
  });

  it('TwoNames_ReturnsTwoInitialsUppercased', () => {
    expect(initialsOf('alice bob')).toBe('AB');
  });

  it('ThreeNames_ReturnsFirstTwoInitials', () => {
    expect(initialsOf('Alice Bob Carol')).toBe('AB');
  });
});
