import { db } from '@/db';
import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// Session → users.id, the shared actor-resolution helper for action modules
// (see openspec/specs/server-endpoint-authorization). Lives apart from the
// user read module so importing reads never drags in NextAuth initialization.
export async function authedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true },
  });
  return u?.id ?? null;
}
