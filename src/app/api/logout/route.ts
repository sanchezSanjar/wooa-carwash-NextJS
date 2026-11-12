import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl, sameOrigin, SESSION_COOKIE } from "@/lib/server/session";

/** Ends the login on the API too (the token stops working), then removes the cookie. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${apiUrl()}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  const out = new NextResponse(null, { status: 204 });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
