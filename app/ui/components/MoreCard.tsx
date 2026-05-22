import Link from 'next/link';

export default function MoreCard({
  moreCount,
  href,
}: {
  moreCount: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="more-card"
      aria-label={`${moreCount} more — see all`}
    >
      <span className="more-card-text">
        +{moreCount} more <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
