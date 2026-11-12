import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl, LANG_COOKIE, sameOrigin, SESSION_COOKIE } from "@/lib/server/session";

type Context = { params: Promise<{ path: string[] }> };

/** Request headers passed on to the API (everything else, cookies included, stays here). */
const PASS_REQUEST = ["content-type", "accept"];
/** Response headers passed back to the browser. */
const PASS_RESPONSE = ["content-type", "content-disposition", "cache-control"];

/**
 * The browser calls /api/proxy/<api path>; this adds the admin's token from the cookie and forwards
 * the call to the API. Photos (/uploads/...) carry their own signature and work the same way.
 */
async function forward(request: Request, { params }: Context) {
  const method = request.method;
  if (method !== "GET" && method !== "HEAD" && !sameOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { path } = await params;
  if (path.some((part) => part === "." || part === "..")) return NextResponse.json({ message: "Not found" }, { status: 404 });
  // each part is encoded on its own: "/" or "?" inside a part can't reach another API path
  const target = new URL(`${apiUrl()}/${path.map(encodeURIComponent).join("/")}`);
  target.search = new URL(request.url).search;

  const jar = await cookies();
  const headers = new Headers();
  for (const name of PASS_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("accept-language", jar.get(LANG_COOKIE)?.value === "en" ? "en" : "ko");
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ message: "Can't reach the server" }, { status: 502 });
  }

  const out = new NextResponse(res.status === 204 ? null : res.body, { status: res.status });
  for (const name of PASS_RESPONSE) {
    const value = res.headers.get(name);
    if (value) out.headers.set(name, value);
  }
  // the login ended (expired, logged out elsewhere, blocked): drop the cookie so the page sends you to log in
  if (res.status === 401) out.cookies.delete(SESSION_COOKIE);
  return out;
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
