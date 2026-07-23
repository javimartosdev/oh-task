import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isPublicPage =
    pathname === "/install" ||
    pathname === "/offline" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons");
  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/billing/webhook");

  if (isPublicApi) return NextResponse.next();

  if (!isLoggedIn && !isAuthPage && !isPublicPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/inbox", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|apple-touch-icon.png|sw.js).*)",
  ],
};
