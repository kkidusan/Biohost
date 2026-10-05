import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getAdminAuth, getAdminDb } from "../../lib/admin";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

// ---------------------------------------------

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 200 });
  res.headers.set("Access-Control-Allow-Origin", "https://yegnajobs.netlify.app");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

export async function POST(request: NextRequest) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  try {
    const { email, fullName, role } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const selectedRole = role === "tutor" ? "tutor" : role === "admin" ? "admin" : "student";

    // ----- Verify Firebase ID token -----
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.email !== email) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const uid = decoded.uid;

    // ----- Store user data in 'customers' collection only -----
    const userData = {
      email: email.trim(),
      fullName: fullName?.trim() || "",
      role: selectedRole,
      createdAt: new Date().toISOString(),
    };
    await adminDb.collection("customers").doc(uid).set(userData, { merge: true });

    // ----- Create session cookie -----
    const sessionToken = jwt.sign(
      { uid, email, role: selectedRole },
      JWT_SECRET,
      { expiresIn: "3d" }
    );

    const response = NextResponse.json({
      message: "Signup successful",
      email,
      role: selectedRole,
    });

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 3,
      sameSite: "strict",
    });

    response.headers.set("Access-Control-Allow-Origin", "https://yegnajobs.netlify.app");
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  } catch (error: any) {
    console.error("Signup Error:", error);
    return NextResponse.json(
      { error: error.message ?? "Signup failed" },
      { status: 400 }
    );
  }
}

export const dynamic = "force-dynamic";
