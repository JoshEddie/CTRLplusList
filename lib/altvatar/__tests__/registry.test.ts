import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STYLE,
  isAltvatarStyleId,
  styleOf,
} from '@/lib/altvatar/registry';

describe('isAltvatarStyleId', () => {
  it('NamedStyle_ReturnsTrue', () => {
    expect(isAltvatarStyleId('personas')).toBe(true);
  });

  it('LibraryStyleNobodyRegistered_ReturnsFalse', () => {
    expect(isAltvatarStyleId('shapes')).toBe(false);
  });
});

describe('styleOf', () => {
  it('NamedStyle_ReturnsThatStyle', () => {
    expect(styleOf('openmoji').id).toBe('openmoji');
  });

  it('UnregisteredId_ReturnsTheDefaultStyle', () => {
    // A stored style id that no longer resolves must still draw a face rather
    // than crash the surface reading it.
    expect(styleOf('shapes').id).toBe(DEFAULT_STYLE);
  });
});
