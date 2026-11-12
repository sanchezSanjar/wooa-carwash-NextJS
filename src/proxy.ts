import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "wooa_admin";

/**
 * Pages need a login: without the cookie, go to /login first. This is only a quick check;
 * the API itself checks every request (the token, and that the member is an admin).
 */
export function proxy(request: NextRequest) {
  const loggedIn = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!loggedIn) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // every page, not the API routes, Next's own files or the icon
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
