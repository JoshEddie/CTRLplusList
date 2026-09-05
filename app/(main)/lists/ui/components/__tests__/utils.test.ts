import { describe, expect, it } from 'vitest';
import { dateFieldError, dateInputValue } from '../utils';

describe('dateFieldError', () => {
  it('WellFormedDate_ReturnsNull', () => {
    expect(dateFieldError('2026-03-04')).toBeNull();
  });

  it('EmptyString_ReturnsInvalidDateMessage', () => {
    expect(dateFieldError('')).toBe('Please enter a valid date');
  });

  it('NonDateText_ReturnsInvalidDateMessage', () => {
    expect(dateFieldError('not-a-date')).toBe('Please enter a valid date');
  });

  it('YearBelowFourDigits_ReturnsYearFloorMessage', () => {
    expect(dateFieldError('0026-03-04')).toBe(
      'Please enter a year of 1900 or later'
    );
  });
});

describe('dateInputValue', () => {
  it('DateObject_ReturnsIsoDayWithoutTime', () => {
    expect(dateInputValue(new Date('2026-03-04T18:20:00.000Z'))).toBe(
      '2026-03-04'
    );
  });

  it('IsoString_ReturnsIsoDayWithoutTime', () => {
    expect(dateInputValue('2026-12-25T00:00:00.000Z')).toBe('2026-12-25');
  });
});
