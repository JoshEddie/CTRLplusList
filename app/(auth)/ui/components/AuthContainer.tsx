import '../styles/auth.css';

export default function AuthContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sign-in-page ${className}`}>
      <div className="auth-container">
        {children}
      </div>
    </div>
  )
}