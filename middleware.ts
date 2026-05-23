import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  if (pathname.startsWith("/admin")) {
    if (session?.user?.role === "ADMIN") return NextResponse.next();
    const loginUrl = new URL("/login", request.nextUrl.origin);
    // Use a relative callbackUrl so the login page's safeCallbackUrl guard
    // (which requires the path to start with "/") can accept it.
    const relativeCallback = request.nextUrl.pathname + (request.nextUrl.search || "");
    loginUrl.searchParams.set("callbackUrl", relativeCallback);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.match(/^\/coffees\/[^/]+\/review/)) {
    if (session?.user) return NextResponse.next();
    const loginUrl = new URL("/login", request.nextUrl.origin);
    const relativeCallback = request.nextUrl.pathname + (request.nextUrl.search || "");
    loginUrl.searchParams.set("callbackUrl", relativeCallback);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/coffees/:slug/review"],
};
