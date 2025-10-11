import { accounts, users } from "@/db/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "../db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  theme: { logo: "https://ctrlpluslist.com/ctrlpluslist_logo-hor-white.webp" },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true, // Trust the host in development
  callbacks: {
    async signIn({ user, profile }) {
      // Use Google's given_name (first name) if available, otherwise fall back to splitting
      if (profile?.given_name) {
        user.name = profile.given_name;
      } else if (user.name) {
        user.name = user.name.split(' ')[0];
      }
      return true;
    },
    jwt({ token, trigger, session }) {
      if (trigger === "update") {
        token.name = session.user.name;
      }
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});
