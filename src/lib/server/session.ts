import "server-only";

/**
 * The admin's login lives in an httpOnly cookie: page scripts can't read it, so a bad script on the
 * page can't steal it. The browser never talks to the API directly; /api/proxy adds the token.
 */
export const SESSION_COOKIE = "wooa_admin";
export const LANG_COOKIE = "wooa_lang";

/** Same as the API's login lifetime (JWT_EXPIRES_IN, 1 day). */
const SESSION_SECONDS = 24 * 60 * 60;

/** Where the NestJS API runs, as seen from this server. */
export const apiUrl = () => (process.env.WOOA_API_URL || "http://localhost:3000").replace(/\/+$/, "");

export const sessionCookie = (token: string) => ({
  name: SESSION_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
});

/**
 * Requests that change something must come from this site's own pages. With the strict cookie this
 * stops other sites from making an admin's browser send requests here (CSRF).
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
