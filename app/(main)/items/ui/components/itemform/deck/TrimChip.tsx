// Tappable "tap to use" suggestion chip on a lavender surface — a page-scoped
// accessible <button>, not a text link (D9). Used on the title card and Preview.
export function TrimChip({
  suggestion,
  onApply,
  disabled,
}: {
  suggestion: string;
  onApply: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="deck-trim-chip"
      onClick={onApply}
      disabled={disabled}
    >
      <span className="deck-trim-chip-label">Tap to use</span>
      <span className="deck-trim-chip-value">{suggestion}</span>
    </button>
  );
}
