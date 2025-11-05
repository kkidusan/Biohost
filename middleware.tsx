// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

// === 1. Valid static routes (EXACT MATCH) ===
const VALID_STATIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/notfound",
  "/read",
  "/reset-password",
  "/profile",
  "/story",           // ← Book list page
  "/learn",
  "/settings",
  "/notifications",
];

// === 2. Dynamic route patterns (allowed without auth) ===
const DYNAMIC_ROUTE_PATTERNS = [
  /^\/meeting\/[\w-]+$/,
  /^\/posts\/track\/[\w-]+$/,
  /^\/story\/[\w-]+\/edit$/,           // Optional: if you have /story/abc123/edit
  /^\/story\/[\w-]+$/,                 // ← This allows /story/[bookId]
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.url;

  // === LOG (remove in production) ===
  console.log(`Middleware: ${pathname}`);

  // === 1. Skip static assets, API, _next, favicon, files with extension ===
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    /\.\w+$/.test(pathname) // .js, .css, .png, .jpg, etc.
  ) {
    return NextResponse.next();
  }

  // === 2. Allow /notfound early (prevent redirect loop) ===
  if (pathname === "/notfound") {
    return NextResponse.next();
  }

  // === 3. Allow exact static routes ===
  if (VALID_STATIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // === 4. Allow dynamic route patterns ===
  if (DYNAMIC_ROUTE_PATTERNS.some((regex) => regex.test(pathname))) {
    return NextResponse.next();
  }

  // === 5. Block everything else → redirect to /notfound ===
  const redirectUrl = new URL("/notfound", request.url);
  return NextResponse.redirect(redirectUrl);
}

// === Apply middleware to all page routes (exclude API, _next, static files) ===
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};