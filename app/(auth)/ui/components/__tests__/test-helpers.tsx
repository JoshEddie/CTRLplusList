import { forwardRef } from 'react';
import type {
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
} from 'react';
import type { Session } from 'next-auth';

// Build the next-auth `Session` shape the auth-UI components read
// (`session.user.{name,email,image}`). Pass `null`/`undefined` fields to
// exercise the name/email/image fallback branches; omit `user` for the
// signed-out path.
export function makeSession(
  user: Partial<NonNullable<Session['user']>> | null = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: 'https://img.example/ada.png',
  }
): Session {
  return {
    ...(user ? { user } : {}),
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  } as Session;
}

type MockNextLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string;
  children?: ReactNode;
};

// Next 15's <Link> reads AppRouterContext for prefetching; in jsdom with no
// provider, render() throws. The mock returns a plain anchor matching the
// prop surface tests care about (href + arbitrary anchor attrs).
export const MockNextLink = forwardRef<HTMLAnchorElement, MockNextLinkProps>(
  function MockNextLink({ children, href, ...rest }, ref) {
    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  }
);

type MockNextImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
};

// Map next/image's prop surface (`priority`, `width`, `height`) onto native
// `<img>` attributes. The Next-internal optimization pipeline is not
// observable in jsdom; the alt/src/dimensions are what these tests assert.
export function MockNextImage({
  priority,
  width,
  height,
  src,
  alt,
  ...rest
}: MockNextImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- mocking next/image is the entire point of this helper
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      fetchPriority={priority ? 'high' : 'auto'}
      {...rest}
    />
  );
}
