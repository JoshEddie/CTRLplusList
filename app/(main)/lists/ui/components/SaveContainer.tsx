import { getSavedStatus } from "@/lib/dal";
import SaveButton from "./SaveButton";

export default async function SaveContainer({ list_id, user_id }: { list_id: string; user_id: string }) {
    const result = await getSavedStatus(list_id, user_id);
    const saved = result !== undefined;

    return (
        <SaveButton saved={saved} list_id={list_id} user_id={user_id} />
    );
}