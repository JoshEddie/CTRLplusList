import { signOutUser } from "@/app/actions/user";
import { LuLogOut } from "react-icons/lu";

export default function SignOutButton({ action }: { action: () => void }) {
  return (
    <form
      className="sign-out-button"
      action={signOutUser}
    >
      <button type="submit" className="btn primary outline" onClick={action}>
        <LuLogOut size={20} />
        Sign Out
      </button>
    </form>
  );
}