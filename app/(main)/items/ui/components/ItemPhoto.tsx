/* eslint-disable @next/next/no-img-element */

const ItemPhoto: React.FC<{ name: string; url: string }> = ({ name, url }) => {
  return (
    <div className="item-image-container">
      {url && (
        <img
          className="item-image"
          src={url}
          alt={name}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

export default ItemPhoto;
