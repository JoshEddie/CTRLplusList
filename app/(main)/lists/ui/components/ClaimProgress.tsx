export default function ClaimProgress({
  claimed,
  total,
}: {
  claimed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((claimed / total) * 100)) : 0;
  return (
    <div className="list-hero-progress-track">
      <div className="list-hero-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
