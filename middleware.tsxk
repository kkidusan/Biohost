// middleware.ts
import { NextResponse, NextRequest } from "next/server";

// List of valid static routes (without trailing slash)
const validStaticRoutes = [
  "",
  "login",
  "signup",
  "forgot-password",
  "story",
  "profile",
  "learn",
  "notfound",
  "read",
  "reset-password",
  "settings",
  "notifications",
  "story-studio", // Added
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Normalize path: remove trailing slashes
  const cleanedPath = pathname.replace(/\/+$/, "");
  const trimmed = cleanedPath.startsWith("/") ? cleanedPath.slice(1) : cleanedPath;

  // Allow root "/"
  if (cleanedPath === "") {
    return NextResponse.next();
  }

  // Allow valid static pages
  if (validStaticRoutes.includes(trimmed)) {
    return NextResponse.next();
  }

  // Allow dynamic story-studio routes: /story-studio/[id]
  if (cleanedPath.startsWith("/story-studio/") && cleanedPath.split("/").length === 3) {
    return NextResponse.next();
  }

  // Allow all static assets in /public
  if (
    /^\/.*\.(json|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/.test(pathname) ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Redirect all other routes to /notfound
  return NextResponse.redirect(new URL("/notfound", request.url));
}

export const config = {
  matcher: [
    // Apply middleware to all routes except API and Next.js internals
    "/((?!api|_next/static|_next/image|_next/data).*)",
  ],
};