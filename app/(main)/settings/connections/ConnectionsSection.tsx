export default function ConnectionsSection({
  title,
  emptyMessage,
  count,
  children,
}: {
  title: string;
  emptyMessage: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="connections-section">
      <h2>
        {title} ({count})
      </h2>
      {count === 0 ? (
        <p className="connections-empty">{emptyMessage}</p>
      ) : (
        <ul className="connections-list">{children}</ul>
      )}
    </section>
  );
}
