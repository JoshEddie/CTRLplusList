import { describe, expect, it } from 'vitest';
import {
  detailsChanged,
  editModeSaveLabel,
  enterEditHref,
  entryDiff,
  exitEditHref,
  moveEntry,
  pendingChanges,
  stagedUnits,
} from '../editModeChanges';
import { entry } from './test-helpers';

describe('editModeSaveLabel', () => {
  it('ExistingList_AlwaysSave', () => {
    expect(editModeSaveLabel(false, 5)).toBe('Save');
  });

  it('NewListNoSelection_ShowsSkip', () => {
    expect(editModeSaveLabel(true, 0)).toBe('Skip');
  });

  it('NewList_PluralizesItemCount', () => {
    expect(editModeSaveLabel(true, 1)).toBe('Add 1 item');
    expect(editModeSaveLabel(true, 2)).toBe('Add 2 items');
  });
});

describe('enterEditHref', () => {
  it('NoParams_AddsEditAlone', () => {
    expect(enterEditHref('l1', null)).toBe('/lists/l1?edit=1');
  });

  it('SpoilerAndFilterParams_RideIntoTheMode', () => {
    expect(
      enterEditHref('l1', new URLSearchParams('spoiler=claims&store=Amazon'))
    ).toBe('/lists/l1?spoiler=claims&store=Amazon&edit=1');
  });

  it('AlreadyInMode_StaysAtOneEditParam', () => {
    expect(enterEditHref('l1', new URLSearchParams('edit=1'))).toBe(
      '/lists/l1?edit=1'
    );
  });
});

describe('exitEditHref', () => {
  it('OnlyModeParams_ReturnsTheBareListPath', () => {
    expect(exitEditHref('l1', new URLSearchParams('edit=1&new=1'))).toBe(
      '/lists/l1'
    );
  });

  it('SpoilerAndFilterParams_SurviveTheExit', () => {
    expect(
      exitEditHref('l1', new URLSearchParams('edit=1&spoiler=claims&q=cake'))
    ).toBe('/lists/l1?spoiler=claims&q=cake');
  });

  it('NoParams_ReturnsTheBareListPath', () => {
    expect(exitEditHref('l1', null)).toBe('/lists/l1');
  });
});

describe('entryDiff', () => {
  it('AddsRemovesAndRequantifies_CountsEachAxis', () => {
    const diff = entryDiff(
      [entry('a'), entry('b'), entry('c', 2)],
      [entry('a'), entry('c', 3), entry('d')]
    );
    expect(diff).toEqual({
      added: 1,
      removed: 1,
      requantified: 1,
      reordered: false,
    });
  });

  it('EntriesUnchanged_ReturnsNoChange', () => {
    const entries = [entry('a'), entry('b')];
    expect(entryDiff(entries, [...entries])).toEqual({
      added: 0,
      removed: 0,
      requantified: 0,
      reordered: false,
    });
  });

  it('EntriesEmptied_CountsEveryInitialAsRemoved', () => {
    expect(entryDiff([entry('a'), entry('b')], []).removed).toBe(2);
  });

  it('SharedRowsSwapped_ReportsReordered', () => {
    expect(
      entryDiff([entry('a'), entry('b')], [entry('b'), entry('a')]).reordered
    ).toBe(true);
  });

  it('OnlyAddsAndRemovalsBetweenSharedRows_IsNotReordered', () => {
    expect(
      entryDiff(
        [entry('a'), entry('x'), entry('b')],
        [entry('a'), entry('n'), entry('b')]
      ).reordered
    ).toBe(false);
  });
});

describe('pendingChanges', () => {
  const initial = [entry('a'), entry('b'), entry('c')];

  it('Pristine_MarksNothing', () => {
    expect(pendingChanges(initial, [...initial], new Set())).toEqual(new Set());
  });

  it('AddedRemovedRequantifiedAndMoved_MarksEachRowOnce', () => {
    const staged = [entry('c'), entry('a', 4), entry('d')];
    expect(pendingChanges(initial, staged, new Set(['c']))).toEqual(
      new Set(['a', 'b', 'c', 'd'])
    );
  });

  it('MovedRowOnly_LeavesDisplacedRowsUnmarked', () => {
    const staged = [entry('c'), entry('a'), entry('b')];
    expect(pendingChanges(initial, staged, new Set(['c']))).toEqual(
      new Set(['c'])
    );
  });
});

describe('stagedUnits', () => {
  it('MixedQuantities_SumsThem', () => {
    expect(
      stagedUnits([
        { item_id: 'a', quantity: 1 },
        { item_id: 'b', quantity: 4 },
      ])
    ).toBe(5);
  });

  it('NoEntries_ReturnsZero', () => {
    expect(stagedUnits([])).toBe(0);
  });
});

describe('moveEntry', () => {
  const entries = ['a', 'b', 'c'].map((item_id) => ({ item_id, quantity: 1 }));
  const ids = (list: { item_id: string }[]) => list.map((e) => e.item_id);

  it('DragDown_PlacesTheRowAtTheTarget', () => {
    expect(ids(moveEntry(entries, 'a', 'c'))).toEqual(['b', 'c', 'a']);
  });

  it('DragUp_PlacesTheRowAtTheTarget', () => {
    expect(ids(moveEntry(entries, 'c', 'a'))).toEqual(['c', 'a', 'b']);
  });

  it('UnknownTarget_ReturnsTheSameArray', () => {
    expect(moveEntry(entries, 'a', 'zz')).toBe(entries);
  });

  it('SameRow_ReturnsTheSameArray', () => {
    expect(moveEntry(entries, 'b', 'b')).toBe(entries);
  });
});

describe('detailsChanged', () => {
  const list = {
    name: 'Birthday',
    subtitle: 'Brandy Family',
    occasion: 'Birthday',
    date: new Date('2026-03-04T00:00:00.000Z'),
  };
  const draft = {
    name: 'Birthday',
    subtitle: 'Brandy Family',
    occasion: 'Birthday',
    date: '2026-03-04',
  };

  it('DraftMatchesList_ReturnsFalse', () => {
    expect(detailsChanged(draft, list)).toBe(false);
  });

  it('NameEdited_ReturnsTrue', () => {
    expect(detailsChanged({ ...draft, name: 'Xmas' }, list)).toBe(true);
  });

  it('DateEdited_ReturnsTrue', () => {
    expect(detailsChanged({ ...draft, date: '2026-03-05' }, list)).toBe(true);
  });

  it('SubtitleClearedAgainstNull_ReturnsFalse', () => {
    expect(
      detailsChanged({ ...draft, subtitle: '  ' }, { ...list, subtitle: null })
    ).toBe(false);
  });

  it('SubtitleClearedAgainstText_ReturnsTrue', () => {
    expect(detailsChanged({ ...draft, subtitle: '' }, list)).toBe(true);
  });
});
