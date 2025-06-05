import Header from "@/app/ui/components/Header";
import { auth } from "@/lib/auth";
import { getItemsByPurchased, getUserIdByEmail } from "@/lib/dal";
import { redirect } from "next/navigation";
import Items from "../items/ui/components/Items";

export default async function Purchased() {

    const session = await auth();
    if (!session?.user?.email) {
        redirect('/');
    }

    const user = await getUserIdByEmail(session.user.email);
    if (!user) {
        redirect('/');
    }

    const items = await getItemsByPurchased(user.id);
    return (
        <div>
            <Header title="Purchased" />
            <Items items={items} />
        </div>
    );
}