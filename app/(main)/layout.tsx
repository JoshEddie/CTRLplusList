import Menu from "../ui/components/Menu";
import './items/ui/styles/item.css';
import './lists/ui/styles/list.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Menu />
      <main className="container">{children}</main>
    </>
  );
}