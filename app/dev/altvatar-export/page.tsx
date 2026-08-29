import { notFound } from 'next/navigation';
import AltvatarExportPage from './AltvatarExportPage';

// Poster tooling, dead outside local mode: the flag that swaps the DB driver
// is also what marks a build as a dev workbench.
export default function Page() {
  if (process.env.USE_PG_DRIVER !== '1') notFound();
  return <AltvatarExportPage />;
}
