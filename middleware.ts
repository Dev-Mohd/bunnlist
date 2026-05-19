import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!isAdminRoute || request.auth?.user?.role === "ADMIN") {
    return NextResponse.next();
  }

  const signInUrl = new URL("/api/auth/signin", request.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/admin/:path*"],
};
