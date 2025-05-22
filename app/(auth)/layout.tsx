import './ui/styles/auth.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="auth-container">
      <div className="auth-content">{children}</div>
    </div>
  );
}
