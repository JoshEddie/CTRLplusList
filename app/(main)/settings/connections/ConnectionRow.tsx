import Link from 'next/link';

export default function ConnectionRow({
  userId,
  name,
  actions,
}: {
  userId: string;
  name: string | null;
  actions: React.ReactNode;
}) {
  return (
    <li className="connections-row">
      <Link href={`/u/${userId}`} className="connections-link">
        {name ?? 'Unnamed'}
      </Link>
      <div className="connections-row-actions">{actions}</div>
    </li>
  );
}
