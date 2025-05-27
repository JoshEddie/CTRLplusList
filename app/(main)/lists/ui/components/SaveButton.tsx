'use client';

import { saveList, unsaveList } from "@/app/actions/lists";
import { useState } from "react";
import { FaCheck, FaPlus } from "react-icons/fa";

export default function SaveButton({ saved, list_id, user_id }: { saved: boolean, list_id: string; user_id: string }) {

    const [isSaved, setIsSaved] = useState(saved);

    return (
        <button className="btn primary" onClick={() => {
            if (isSaved) {
                unsaveList(list_id, user_id);
                setIsSaved(false);
            } else {
                saveList(list_id, user_id);
                setIsSaved(true);
            }
        }}>
            {isSaved ? <FaCheck /> : <FaPlus />}
            <span className="label mobile-hide">{isSaved ? 'Saved' : 'Add List'}</span>
        </button>
    );
}