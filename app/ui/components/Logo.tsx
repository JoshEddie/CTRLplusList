import Image from "next/image";

const Logo = () => {
  return (
    <Image
      src="/ctrlpluslist_logo-hor-white.webp"
      alt="Ctrl+List"
      className="menu-logo"
      width={199}
      height={52}
    />
  );
};

export default Logo;
