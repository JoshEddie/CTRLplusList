import { notFound } from 'next/navigation';
import { connection } from 'next/server';

// Local-mode-only fixture for exercising the (main) error boundary end-to-end
// (e2e + manual verification). Gated on the same USE_PG_DRIVER flag as the
// auth bypass; deployed environments never set it, so this is a 404 there.
export default async function DevErrorPage() {
  await connection();
  if (process.env.USE_PG_DRIVER !== '1') notFound();
  throw new Error('intentional boundary-verification error');
}
