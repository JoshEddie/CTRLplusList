import Menu from "../ui/components/Menu";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Menu />
      <main className="container">{children}</main>
    </>
  );
}