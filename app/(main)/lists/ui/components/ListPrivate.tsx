import { FaLock } from "react-icons/fa";

export default function ListPrivate({ loggedIn }: { loggedIn: boolean }) {
    return (
        <div className="list-private">
            <h1><FaLock size={26}/> This list is private</h1>
            <p>The owner of this list has marked this list as private. If someone shared the link with you please ask them to make it public first.</p>
            {!loggedIn && <p>If you are the owner of this list please login to view it.</p>}
        </div>
    );
}