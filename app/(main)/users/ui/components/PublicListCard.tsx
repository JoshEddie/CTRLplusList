import Link from 'next/link';

export default function PublicListCard({
  list,
}: {
  list: { id: string; name: string; occasion: string };
}) {
  return (
    <li className="profile-list-card">
      <Link href={`/lists/${list.id}`}>
        <div className="profile-list-name">{list.name}</div>
        <div className="profile-list-occasion">{list.occasion}</div>
      </Link>
    </li>
  );
}
