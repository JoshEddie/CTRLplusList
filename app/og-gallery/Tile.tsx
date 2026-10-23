/* eslint-disable @next/next/no-img-element -- dev gallery of generated PNGs */
export default function Tile({ label, src }: { label: string; src: string }) {
  return (
    <figure style={{ margin: 0 }}>
      <a href={src} target="_blank">
        <img
          src={src}
          alt={label}
          loading="lazy"
          style={{ width: '100%', display: 'block', border: '1px solid #ccc' }}
        />
      </a>
      <figcaption style={{ fontSize: 13, padding: '4px 0' }}>
        {label}
      </figcaption>
    </figure>
  );
}
