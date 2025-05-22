/* eslint-disable @next/next/no-img-element */

const ItemPhoto: React.FC<{ name: string; url: string }> = ({ name, url }) => {
  return (
    <div className="item-image-container">
      <img className="item-image" src={url} alt={name} />
    </div>
  );
};

export default ItemPhoto;
