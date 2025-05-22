export default function Button({
  children,
  type,
  className,
  isLoading,
}: {
  children: React.ReactNode;
  type: 'submit' | 'reset' | 'button' | undefined;
  className: string;
  isLoading?: boolean;
}) {
  return (
    <>
      <button type={type} className={className}>
        {isLoading ? 'Loading...' : children}
      </button>
    </>
  );
}
