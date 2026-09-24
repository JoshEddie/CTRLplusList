import { Button } from '@/app/ui/components/button';
import type { ClaimPicker } from '@/lib/data/user.actions';
import { getMessage } from '@/lib/i18n/utils';
import ClaimDisclosure, {
  type AttributedTarget,
  type PickerStatus,
} from './ClaimDisclosure';

// Four sentences, not one with two holes: "I bought 3 of these myself" and
// "Claim 3 of these" are different sentences, and each drops its number below
// two rather than reading "Claim 1 of these".
function claimCtaLabel(isOwner: boolean, units: number): string {
  if (units > 1) {
    return getMessage(
      isOwner ? 'claim_cta_owner_units' : 'claim_cta_viewer_units',
      {
        units,
      }
    );
  }
  return getMessage(isOwner ? 'claim_cta_owner' : 'claim_cta_viewer');
}

export default function AuthedClaimSection({
  isOwner,
  canClaim,
  viewerIsPurchaser,
  circleLabel,
  pickerStatus,
  pool,
  units,
  onRetry,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
}: {
  isOwner: boolean;
  canClaim: boolean;
  viewerIsPurchaser?: boolean;
  circleLabel: string;
  pickerStatus: PickerStatus;
  pool: ClaimPicker['pool'];
  /** How many units the CTA would claim, so the button states the ask rather than leaving it to the control above it. */
  units: number;
  onRetry: () => void;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
}) {
  if (!canClaim) return null;
  return (
    <>
      {(isOwner || !viewerIsPurchaser) && (
        <Button
          variant="primary"
          className="claim-self-cta"
          onClick={onSelfClaim}
        >
          {claimCtaLabel(isOwner, units)}
        </Button>
      )}
      <ClaimDisclosure
        label={getMessage(
          isOwner
            ? 'claim_disclosure_label_owner'
            : 'claim_disclosure_label_viewer'
        )}
        circleLabel={circleLabel}
        status={pickerStatus}
        pool={pool}
        onRetry={onRetry}
        onAttributedClaim={onAttributedClaim}
        onGuestClaim={onGuestClaim}
      />
    </>
  );
}
