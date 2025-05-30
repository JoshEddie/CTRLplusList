import Image from 'next/image';

export default function UserImage({ image, name }: { image: string; name: string }) {
  return (
    <Image
      className="avatar"
      src={image}
      alt={name}
      width={80}
      height={80}
      priority
    />
  );
}