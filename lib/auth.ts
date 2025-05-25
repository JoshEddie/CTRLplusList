import { accounts, users } from "@/db/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "../db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  theme: { logo: "http://localhost:3000/wishlist.png" },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true, // Trust the host in development
  callbacks: {
    jwt({ token, trigger, session }) {
      if (trigger === "update") {
        token.name = session.user.name
      }
      return token
    },
    async session({ session }) {
      return session;
    },
  },
});
