import { ListTable, UserTable } from "@/lib/types";
interface ListHeaderProps {
  title: string;
  user: UserTable | null;
  list: ListTable;
  children?: React.ReactNode;
}

export default function ListHeader({ title, user, list, children }: ListHeaderProps) {
  return (
    <div className="header">
      <div className="pageTitleContainer">
        <div className="pageTitle">{title}</div>
        {user && <div className="listDetails">List by {user.name} | Date: {list.date.toLocaleDateString()} | Occasion: {list.occasion}</div>}
      </div>
      <div className="header-buttons">{children}</div>
    </div>
  );
}
