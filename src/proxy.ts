import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const HQ_ONLY_PREFIXES = ["/hq", "/stores"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isHqOnly = HQ_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isHqOnly && req.auth?.user.role !== "HQ_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
