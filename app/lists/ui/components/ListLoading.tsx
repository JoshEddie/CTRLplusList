export default function ListLoading() {
  return (
    <div className="list-loading">
      <div className="list-header-loading">
        <div className="list-header-loading-cell" />
        <div className="list-header-loading-cell" />
        <div className="list-header-loading-cell" />
      </div>
      <div className="list-rows-loading">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="list-row-loading">
            <div className="list-row-loading-cell" />
            <div className="list-row-loading-cell" />
            <div className="list-row-loading-cell" />
          </div>
        ))}
      </div>
    </div>
  );
}
