'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

export default function SpoilerToggle({
  showSpoilers,
}: {
  showSpoilers: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleToggle = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (showSpoilers) {
      params.delete('spoilers');
    } else {
      params.set('spoilers', '1');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <button
      type="button"
      className={`btn ${showSpoilers ? 'primary' : 'secondary'} spoiler-toggle`}
      onClick={handleToggle}
      aria-pressed={showSpoilers}
      aria-label={showSpoilers ? 'Hide spoilers' : 'Show spoilers'}
      title={
        showSpoilers
          ? 'Hide who has claimed items'
          : 'Reveal who has claimed items'
      }
    >
      <span className="spoiler-toggle-inner">
        {showSpoilers ? <MdVisibility /> : <MdVisibilityOff />}
        <span>Spoilers</span>
      </span>
      <span
        className={`state-badge ${showSpoilers ? 'on' : 'off'}`}
        aria-hidden="true"
      >
        {showSpoilers ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
