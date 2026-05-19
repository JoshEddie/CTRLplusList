import Link from 'next/link';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ConnectionRow({
  userId,
  name,
  since,
  actions,
}: {
  userId: string;
  name: string | null;
  /** When the relationship was created — drives the "since X" subline. */
  since?: Date | string | null;
  actions: React.ReactNode;
}) {
  return (
    <li className="connections-row">
      <div className="connections-row-meta">
        <Link href={`/u/${userId}`} className="connections-link">
          {name ?? 'Unnamed'}
        </Link>
        {since && (
          <div className="connections-row-since">{formatDate(since)}</div>
        )}
      </div>
      <div className="connections-row-actions">{actions}</div>
    </li>
  );
}
