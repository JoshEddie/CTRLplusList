import { signOutUser } from '@/app/actions/user';
import { Button } from '@/app/ui/components/button';
import { LuLogOut } from 'react-icons/lu';

export default function SignOutButton({ action }: { action: () => void }) {
  return (
    <form className="sign-out-button" action={signOutUser}>
      <Button type="submit" variant="ghost" onClick={action}>
        <LuLogOut size={20} />
        Sign Out
      </Button>
    </form>
  );
}
