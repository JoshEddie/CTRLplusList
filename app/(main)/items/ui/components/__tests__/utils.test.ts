import { describe, expect, it } from 'vitest';
import {
  claimAvatar,
  claimedStatusLabel,
  formatStorePrice,
  resolveModalView,
} from '../utils';
import { makeClaim } from './test-helpers';

describe('claimAvatar', () => {
  it('PurchaserIsAProfile_ReturnsTheirOwnLook', () => {
    const avatar = {
      name: 'Alice Ames',
      accent: 'rose',
      art: 'data:image/svg+xml,art',
      avatarStyle: null,
    };
    expect(claimAvatar(makeClaim('a', { name: 'Alice Ames', avatar }))).toBe(
      avatar
    );
  });

  // A free-text purchaser has no profile, so there is nothing but the typed
  // name to draw from — the disc renders its initials off an unset look.
  it('FreeTextPurchaser_ReturnsAnUnsetLookCarryingTheTypedName', () => {
    expect(claimAvatar(makeClaim('a', { name: 'Grandma Jones' }))).toEqual({
      name: 'Grandma Jones',
      accent: null,
      art: null,
      avatarStyle: null,
    });
  });
});

describe('resolveModalView', () => {
  const resolve = (
    overrides: Partial<Parameters<typeof resolveModalView>[0]> = {}
  ) =>
    resolveModalView({
      isOwner: false,
      purchaseView: null,
      hasViewerClaim: false,
      ...overrides,
    });

  describe('RosterParam', () => {
    it('Viewer_ReturnsRoster', () => {
      expect(resolve({ purchaseView: 'roster' })).toBe('roster');
    });

    // The owner reaches the roster through the same banner as everyone else,
    // so the parameter outranks the ownership route to the add flow.
    it('Owner_ReturnsRoster', () => {
      expect(resolve({ isOwner: true, purchaseView: 'roster' })).toBe('roster');
    });

    it('Holder_ReturnsRosterRatherThanTheirManageView', () => {
      expect(
        resolve({ purchaseView: 'roster', hasViewerClaim: true })
      ).toBe('roster');
    });
  });

  describe('NoRosterParam', () => {
    it('Owner_ReturnsClaim', () => {
      expect(resolve({ isOwner: true, hasViewerClaim: true })).toBe('claim');
    });

    it('ClaimParam_ReturnsClaim', () => {
      expect(
        resolve({ purchaseView: 'claim', hasViewerClaim: true })
      ).toBe('claim');
    });

    it('Holder_ReturnsManage', () => {
      expect(resolve({ hasViewerClaim: true })).toBe('manage');
    });

    it('Bystander_ReturnsClaim', () => {
      expect(resolve()).toBe('claim');
    });

    it('UnknownParam_FallsToTheDefaultRule', () => {
      expect(
        resolve({ purchaseView: 'nonsense', hasViewerClaim: true })
      ).toBe('manage');
    });
  });
});

describe('claimedStatusLabel', () => {
  const capacity = { quantity: 4, remaining: 1 };

  it('ClaimsTier_StatesWhatTheEntryHasSpokenFor', () => {
    expect(claimedStatusLabel(capacity, 'claims')).toBe('3 of 4 claimed');
  });

  it.each(['surprise', 'progress'] as const)(
    'BelowClaimsAt%s_StatesNothing',
    (tier) => {
      expect(claimedStatusLabel(capacity, tier)).toBeUndefined();
    }
  );

  it('NoEntry_StatesNothing', () => {
    expect(claimedStatusLabel(null, 'claims')).toBeUndefined();
  });
});

describe('formatStorePrice', () => {
  it('StringPrice_FormatsTwoDecimals', () => {
    expect(formatStorePrice('35.5')).toBe('$35.50');
  });

  it('DollarPrefixedString_StripsPrefixBeforeFormatting', () => {
    expect(formatStorePrice('$19.99')).toBe('$19.99');
  });

  it('NumberPrice_Formats', () => {
    expect(formatStorePrice(1234.5)).toBe('$1,234.50');
  });
});
