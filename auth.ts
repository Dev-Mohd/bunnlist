import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { getAppleClientSecret } from "@/lib/apple-secret";

// ---------------------------------------------------------------------------
// Apple Sign In — pre-generate client secret at module load (Node.js only).
// top-level await is safe here: this module is never imported on the edge.
// If Apple env vars are absent the provider is simply omitted.
// ---------------------------------------------------------------------------
const _appleClientId = process.env.APPLE_CLIENT_ID;
const _appleSecret = _appleClientId ? await getAppleClientSecret() : null;
const appleProvider =
  _appleClientId && _appleSecret
    ? Apple({ clientId: _appleClientId, clientSecret: _appleSecret })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    ...authConfig.providers,
    ...(appleProvider ? [appleProvider] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user.email && user.email === process.env.SEED_ADMIN_EMAIL) {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: "ADMIN" },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Re-fetch from DB to get the role after signIn callback may have updated it.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true },
        });
        token.id = user.id!;
        token.role = dbUser?.role ?? "USER";
      }
      return token;
    },
  },
});
