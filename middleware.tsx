// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// === 1. Define valid static routes (EXACT MATCH) ===
const VALID_STATIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/notfound", // This MUST be here
    "/read",
  "/reset-password",
  "/forgot-password",
  "/profile",    
  "/story",  
  "/learn",  
  "/settings",  
  "/notifications",  
  "/profile",  


];

// === 2. Protected routes (require auth) ===
const PROTECTED_ROUTES = ["/story", "/profile"];

// === 3. Dynamic route patterns (allowed without auth) ===
const DYNAMIC_ROUTE_PATTERNS = [
  /^\/meeting\/[\w-]+$/,
  /^\/posts\/track\/[\w-]+$/,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.url;

  // === LOG (Remove in production) ===
  console.log(`Middleware processing: ${pathname}`);

  // === 1. Skip middleware for static files, API, _next, favicon ===
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    /\.\w+$/.test(pathname) // any file with extension: .png, .js, etc.
  ) {
    return NextResponse.next();
  }

  // === 2. Allow /notfound EARLY to prevent loop ===
  if (pathname === "/notfound") {
    console.log("Allowing /notfound (prevent loop)");
    return NextResponse.next();
  }

  // === 3. Allow valid static routes ===
  if (VALID_STATIC_ROUTES.includes(pathname)) {
    console.log(`Valid static route: ${pathname}`);
    if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
      return handleAuth(request);
    }
    return NextResponse.next();
  }

  // === 4. Allow dynamic routes ===
  if (DYNAMIC_ROUTE_PATTERNS.some((regex) => regex.test(pathname))) {
    console.log(`Valid dynamic route: ${pathname}`);
    return NextResponse.next();
  }

  // === 5. Protected route check (e.g., /dashboard/anything) ===
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    return handleAuth(request);
  }

  // === 6. INVALID ROUTE → Redirect to /notfound ===
  console.log(`Invalid route → /notfound: ${pathname}`);
  const redirectUrl = new URL("/notfound", url);
  // Prevent loop: only redirect if not already going to /notfound
  if (pathname !== "/notfound") {
    return NextResponse.redirect(redirectUrl);
  }

  // Fallback (should not reach here)
  return NextResponse.next();
}

// === JWT Auth Handler ===
function handleAuth(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    console.log("No token → /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (err) {
    console.log("Invalid token → /login");
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session_token");
    return response;
  }
}

// === Config: Apply to all pages except API/static ===
export const config = {
  matcher: [
    // Match all paths except:
    // - API routes
    // - _next (static files, images, etc.)
    // - favicon.ico
    // - files with extensions
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};