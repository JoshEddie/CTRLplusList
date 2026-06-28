// Decorative step indicator. Deliberately NOT in an aria-live region (D11) —
// the sr-only text gives position on demand without announcing every advance.
export function ProgressDots({
  count,
  current,
}: {
  count: number;
  current: number;
}) {
  return (
    <div className="deck-dots" role="presentation">
      <span className="sr-only">
        Step {current + 1} of {count}
      </span>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={[
            'deck-dot',
            i === current && 'deck-dot-active',
            i < current && 'deck-dot-done',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}
