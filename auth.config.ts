import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/api/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "USER";
      }

      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
