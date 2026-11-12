import { NextResponse } from "next/server";
import { apiUrl, LANG_COOKIE, sameOrigin, sessionCookie } from "@/lib/server/session";

/** Logs in through the API and keeps the token in the httpOnly cookie. Only admins get in. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const lang = request.headers.get("cookie")?.match(new RegExp(`${LANG_COOKIE}=(ko|en)`))?.[1] ?? "ko";
  const body = (await request.json().catch(() => null)) as { phone?: unknown; password?: unknown } | null;
  if (typeof body?.phone !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ message: lang === "ko" ? "전화번호와 비밀번호를 입력해 주세요" : "Enter your phone number and password" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": lang },
      body: JSON.stringify({ phone: body.phone, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: lang === "ko" ? "서버에 연결할 수 없습니다" : "Can't reach the server" }, { status: 502 });
  }
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; user?: { role?: string; name?: string }; message?: string };
  if (!res.ok || !data.accessToken) return NextResponse.json({ message: data.message ?? "Login failed" }, { status: res.status });

  if (data.user?.role !== "admin") {
    // a member or washer: end the login we just made, it isn't needed here
    await fetch(`${apiUrl()}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${data.accessToken}` } }).catch(() => undefined);
    return NextResponse.json({ message: lang === "ko" ? "관리자만 이용할 수 있습니다" : "Only admins can use this site" }, { status: 403 });
  }

  const out = NextResponse.json({ user: data.user });
  out.cookies.set(sessionCookie(data.accessToken));
  return out;
}
