import ItemCard from '../../ItemCard';
import '../../../styles/item.css';
import { toItemDisplay, type ItemViewModel } from './viewModel';

// "Exactly as it'll appear" has to be the *real* list card, not a lookalike —
// so the preview renders the production ItemCard in the creator's own (owner)
// perspective, with the claim/purchase/owner-action machinery stripped (none
// of it applies to an unsaved item). Gaps render exactly as production renders
// them — a missing price is simply absent, not annotated; the "add a price"
// nudge lives in the Preview's Store-links row, off the card.
export function PreviewCard({ item }: { item: ItemViewModel }) {
  return (
    <div className="item-container preview deck-preview-card">
      <ItemCard
        item={toItemDisplay(item)}
        isOwner
        showPurchased={false}
        showSpoilerInfo={false}
        removableClaim={null}
        claimActionDisabled={false}
        showCounter={false}
        counterText=""
        showOwnerClaimAction={false}
        showOwnerManageAction={false}
      />
    </div>
  );
}
