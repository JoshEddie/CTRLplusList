import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timeAgo } from '../timeAgo';

const NOW = new Date('2026-07-17T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000);

describe('timeAgo', () => {
  it('NullInput_ReturnsEmptyString', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
  });

  it('UnderAMinute_ReturnsJustNow', () => {
    expect(timeAgo(secondsAgo(30))).toBe('just now');
  });

  it('TwoMinutes_Returns2MinutesAgo', () => {
    expect(timeAgo(secondsAgo(120))).toBe('2 minutes ago');
  });

  it('ThreeHours_Returns3HoursAgo', () => {
    expect(timeAgo(secondsAgo(3 * 3600))).toBe('3 hours ago');
  });

  it('OneDay_ReturnsYesterday', () => {
    expect(timeAgo(secondsAgo(86400))).toBe('yesterday');
  });

  it('TwoWeeks_Returns2WeeksAgo', () => {
    expect(timeAgo(secondsAgo(14 * 86400))).toBe('2 weeks ago');
  });

  it('TwoMonths_Returns2MonthsAgo', () => {
    expect(timeAgo(secondsAgo(61 * 86400))).toBe('2 months ago');
  });

  it('TwoYears_Returns2YearsAgo', () => {
    expect(timeAgo(secondsAgo(2 * 31536000 + 86400))).toBe('2 years ago');
  });

  it('IsoStringInput_ParsesAndFormats', () => {
    expect(timeAgo('2026-07-15T12:00:00Z')).toBe('2 days ago');
  });
});
