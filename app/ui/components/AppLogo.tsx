import Image from 'next/image';
import Link from 'next/link';

export default function AppLogo() {
  return (
    <Link href="/" className="app-logo" aria-label="Ctrl+List home">
      <Image
        src="/ctrlpluslist_logo-hor-white.webp"
        alt="Ctrl+List"
        width={199}
        height={52}
        className="app-logo-image"
        priority
      />
    </Link>
  );
}
