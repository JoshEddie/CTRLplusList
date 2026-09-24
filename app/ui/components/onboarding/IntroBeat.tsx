import Image from 'next/image';

export default function IntroBeat({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <>
      <div className="onboarding-story-hd os-rise">
        <span className="onboarding-story-eyebrow">{eyebrow}</span>
        <h1 className="onboarding-story-title">{title}</h1>
      </div>
      <div className="onboarding-story-poster os-pop">
        <Image
          src="/ALTvatars_header.jpg"
          alt="Fifty Altvatars around the alt+vatar wordmark"
          width={775}
          height={550}
          priority
        />
      </div>
      <p className="onboarding-story-lede os-rise os-late">{lede}</p>
    </>
  );
}
