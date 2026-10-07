import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Marketing-only deploys omit NEXT_PUBLIC_API_BASE_URL. Block the authenticated
 * app routes so they never render or call a backend.
 */
export function middleware(request: NextRequest) {
  const workspace = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  if (workspace) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/client") ||
    pathname.startsWith("/organisation") ||
    pathname.startsWith("/platform")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/client",
    "/client/:path*",
    "/organisation",
    "/organisation/:path*",
    "/platform",
    "/platform/:path*",
  ],
};
