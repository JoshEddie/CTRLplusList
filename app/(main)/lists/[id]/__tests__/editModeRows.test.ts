import { describe, expect, it } from 'vitest';
import type { ItemDisplay } from '@/lib/types';
import { cardStatus, listRows, statusLabel } from '../editModeRows';
import { entry } from './test-helpers';

const item = (id: string) =>
  ({ id, name: id.toUpperCase(), description: '', store: null }) as ItemDisplay;
const ITEMS = ['a', 'b', 'c', 'd'].map(item);
const summary = (rows: ReturnType<typeof listRows>) =>
  rows.map((row) => `${row.item.id}:${row.quantity}:${row.status}`);

describe('listRows', () => {
  const saved = [entry('a'), entry('b', 2), entry('c')];

  it('Pristine_EveryRowKeptInStagedOrder', () => {
    expect(summary(listRows(ITEMS, saved, [...saved], new Set()))).toEqual([
      'a:1:kept',
      'b:2:kept',
      'c:1:kept',
    ]);
  });

  it('RemovedEntry_ReinsertedAtItsSavedIndexAtZero', () => {
    const staged = [entry('a'), entry('c')];
    expect(summary(listRows(ITEMS, saved, staged, new Set()))).toEqual([
      'a:1:kept',
      'b:0:removed',
      'c:1:kept',
    ]);
  });

  it('RemovedLastEntryAfterAnAdd_LandsAtItsSavedIndexNotTheEnd', () => {
    const staged = [entry('a'), entry('b', 2), entry('d')];
    expect(summary(listRows(ITEMS, saved, staged, new Set()))).toEqual([
      'a:1:kept',
      'b:2:kept',
      'c:0:removed',
      'd:1:added',
    ]);
  });

  it('SavedIndexPastTheStagedLength_ClampsToTheEnd', () => {
    expect(summary(listRows(ITEMS, saved, [entry('a')], new Set()))).toEqual([
      'a:1:kept',
      'b:0:removed',
      'c:0:removed',
    ]);
  });

  it('MovedAndRequantified_ReadsAsMoved', () => {
    const staged = [entry('b', 5), entry('a'), entry('c')];
    expect(summary(listRows(ITEMS, saved, staged, new Set(['b'])))).toEqual([
      'b:5:moved',
      'a:1:kept',
      'c:1:kept',
    ]);
  });

  it('RequantifiedInPlace_ReadsAsRequantified', () => {
    const staged = [entry('a'), entry('b', 3), entry('c')];
    expect(summary(listRows(ITEMS, saved, staged, new Set()))[1]).toBe(
      'b:3:requantified'
    );
  });

  it('EntryForAnItemNotYetDelivered_SkippedInBothStates', () => {
    const rows = listRows(
      ITEMS,
      [entry('ghost'), entry('a')],
      [entry('a'), entry('new-1')],
      new Set()
    );
    expect(summary(rows)).toEqual(['a:1:kept']);
  });
});

describe('cardStatus', () => {
  it('NeverOnTheList_Kept', () => {
    expect(cardStatus(undefined, undefined)).toBe('kept');
  });

  it('StagedWithoutASavedEntry_Added', () => {
    expect(cardStatus(undefined, 1)).toBe('added');
  });

  it('SavedWithoutAStagedEntry_Removed', () => {
    expect(cardStatus(2, undefined)).toBe('removed');
  });

  it('SameQuantity_Kept', () => {
    expect(cardStatus(2, 2)).toBe('kept');
  });

  it('DifferentQuantity_Requantified', () => {
    expect(cardStatus(2, 4)).toBe('requantified');
  });
});

describe('statusLabel', () => {
  it('EachChangedStatus_HasACaption-KeptHasNone', () => {
    expect(statusLabel('added')).toBe('Added');
    expect(statusLabel('removed')).toBe('Removed');
    expect(statusLabel('requantified')).toBe('Quantity changed');
    expect(statusLabel('moved')).toBe('Moved');
    expect(statusLabel('kept')).toBeNull();
  });
});
