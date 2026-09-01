// The hero's claimed-count footer, shown where the resolved tier is `progress`
// or above (`spoiler-visibility`). A bar plus "N / M claimed" — the count the
// list-scoped aggregate returns, never a per-item disclosure.
export default function ClaimProgress({
  claimed,
  total,
}: {
  claimed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((claimed / total) * 100)) : 0;
  return (
    <div
      className="list-hero-progress"
      role="group"
      aria-label={`${claimed} of ${total} items claimed`}
    >
      <div className="list-hero-progress-track">
        <div className="list-hero-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="list-hero-progress-label">
        {claimed} / {total} claimed
      </span>
    </div>
  );
}
