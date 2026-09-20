import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { getMessage } from '@/lib/i18n/utils';
import type { PurchaseView } from '@/lib/types';
import { claimAvatar } from './utils';
import '../styles/facepile.css';

// How many looks the pile draws before the rest become a count.
const FACES = 3;

// Who is on an item, at a glance. Decorative throughout: every surface that
// carries a pile states the same thing in words beside it, and that text is the
// accessible name — a stack of discs read aloud one by one names nobody.
export default function Facepile({ claims }: { claims: PurchaseView[] }) {
  const shown = claims.slice(0, FACES);
  const rest = claims.length - shown.length;
  return (
    <span className="claim-facepile" aria-hidden>
      {shown.map((claim) => (
        <ProfileAvatar key={claim.id} profile={claimAvatar(claim)} />
      ))}
      {rest > 0 && (
        <span className="claim-facepile-more">
          {getMessage('claim_facepile_more', { count: rest })}
        </span>
      )}
    </span>
  );
}
