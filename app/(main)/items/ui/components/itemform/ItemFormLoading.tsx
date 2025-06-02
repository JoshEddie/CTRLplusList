export default function ItemFormLoading() {
  return (
    <div className="item-form-loading">
      <div className="item-form-loading-item" />

      <div className="loading-form-row name-image-row">
        <div className="loading-cell" />
        <div className="loading-cell" />
      </div>

      <div className="loading-form-row list-quantity-row">
        <div className="loading-cell" />
        <div className="loading-cell" />
      </div>

      <div className="loading-stores">
        {[1, 2, 3].map((i) => (
          <div key={i} className="loading-store">
            <div className="loading-cell" />
            <div className="loading-cell" />
            <div className="loading-cell" />
          </div>
        ))}
      </div>
    </div>
  );
}
  