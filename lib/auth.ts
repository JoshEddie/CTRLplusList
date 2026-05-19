import { accounts, users } from '@/db/schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '../db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  theme: { logo: 'https://ctrlpluslist.com/ctrlpluslist_logo-hor-white.webp' },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true, // Trust the host in development
  callbacks: {
    async signIn({ user, profile }) {
      // Store the full name (first + last) when Google provides both — used
      // for disambiguation on the connections page. Other surfaces extract
      // first name via firstNameOf() in lib/dal.ts to preserve the casual
      // tone in purchase attribution and similar contexts.
      if (profile?.given_name && profile?.family_name) {
        user.name = `${profile.given_name} ${profile.family_name}`;
      } else if (profile?.given_name) {
        user.name = profile.given_name;
      }
      // else: keep whatever default user.name we received
      return true;
    },
    jwt({ token, trigger, session }) {
      if (trigger === 'update') {
        token.name = session.user.name;
      }
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});
