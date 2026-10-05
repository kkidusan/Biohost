// middleware.ts
import { NextResponse, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Normalize path: remove trailing slashes
  const cleanedPath = pathname.replace(/\/+$/, "");

  // Allow root "/"
  if (cleanedPath === "") {
    return NextResponse.next();
  }

  // Allow all valid app routes based on project structure
  const allowedPrefixes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/notifications",
    "/students",
    "/tutors",
    "/admin",
    "/student",
    "/tutor",
    "/onboarding",
  ];

  if (allowedPrefixes.some((prefix) => cleanedPath === prefix || cleanedPath.startsWith(prefix + "/"))) {
    return NextResponse.next();
  }

  // Allow all static assets and Next.js internals
  if (
    /^\/.*\.(json|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot|css|js)$/.test(pathname) ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Let Next.js handle unhandled routes / 404s naturally
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware to all routes except API and Next.js internals
    "/((?!api|_next/static|_next/image|_next/data).*)",
  ],
};
