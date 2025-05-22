interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export default function Header({ title, children }: HeaderProps) {
  return (
    <div className="header">
      <div className="pageTitle">{title}</div>
      <div className="header-buttons">{children}</div>
    </div>
  );
}
