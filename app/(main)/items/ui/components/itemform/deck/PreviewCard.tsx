import ItemCard from '../../ItemCard';
import '../../../styles/item.css';
import { toItemDisplay, type ItemViewModel } from './viewModel';

// "Exactly as it'll appear" has to be the *real* list card, not a lookalike —
// so the preview renders the production ItemCard in the creator's own (owner)
// perspective, with its action area in ItemActions view-only mode (none of
// the claim machinery applies to an unsaved item). Gaps render exactly as
// production renders them — a missing price is simply absent, not annotated;
// the "add a store" nudge lives in the Preview's Store row, off the card.
export function PreviewCard({ item }: { item: ItemViewModel }) {
  return (
    <div className="item-container preview deck-preview-card">
      <ItemCard
        item={toItemDisplay(item)}
        isOwner
        showPurchased={false}
        showSpoilerInfo={false}
        viewerClaimed={false}
        fullyClaimed={false}
        showCounter={false}
        counterText=""
        showOwnerClaimAction={false}
        showOwnerManageAction={false}
        viewOnly
      />
    </div>
  );
}
