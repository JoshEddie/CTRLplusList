import '../styles/item-loading.css';

export default function ItemLoading() {
  return (
    <div className="item-loading">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="item-loading-cell" />
      ))}
    </div>
  );
}
