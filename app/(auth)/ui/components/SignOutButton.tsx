import { signOutUser } from "@/app/actions/user";
import { LuLogOut } from "react-icons/lu";

export default function SignOutButton() {
  return (
    <form
      className="sign-out-button"
      action={signOutUser}
    >
      <button type="submit" className="btn primary outline">
        <LuLogOut size={20} />
        Sign Out
      </button>
    </form>
  );
}