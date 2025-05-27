interface HeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Header({ title, className, children }: HeaderProps) {
  return (
    <div className={`header ${className}`}>
      <div className="pageTitleContainer">
        <div className="pageTitle">{title}</div>
      </div>
      <div className="header-buttons">{children}</div>
    </div>
  );
}
