import { describe, expect, it } from 'vitest';
import {
  detailsChanged,
  editModeSaveLabel,
  enterEditHref,
  entryDiff,
  exitEditHref,
} from '../editModeChanges';

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
  it('SelectionAddsAndRemoves_CountsBothDirections', () => {
    expect(entryDiff(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({
      added: 1,
      removed: 1,
    });
  });

  it('SelectionUnchanged_ReturnsZeroes', () => {
    expect(entryDiff(new Set(['a', 'b']), new Set(['b', 'a']))).toEqual({
      added: 0,
      removed: 0,
    });
  });

  it('SelectionEmptied_CountsEveryInitialAsRemoved', () => {
    expect(entryDiff(new Set(['a', 'b']), new Set())).toEqual({
      added: 0,
      removed: 2,
    });
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
