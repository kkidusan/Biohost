// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
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
    const { email, password, rememberMe } = await request.json();
    const authHeader = request.headers.get("Authorization");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let uid: string | undefined;

    // ---------- GOOGLE OAUTH ----------
    if (password === "google-oauth") {
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Missing ID token" }, { status: 401 });
      }
      const idToken = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(idToken);

      if (decoded.email !== normalizedEmail) {
        return NextResponse.json({ error: "Invalid user" }, { status: 401 });
      }
      uid = decoded.uid;
    }

    // ---------- EMAIL / PASSWORD ----------
    else {
      const userRecord = await adminAuth.getUserByEmail(normalizedEmail).catch(() => null);
      if (!userRecord) {
        return NextResponse.json(
          { error: "Please sign up first." },
          { status: 403 }
        );
      }
      uid = userRecord.uid;

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Missing ID token" }, { status: 401 });
      }
      const idToken = authHeader.slice(7);
      const clientDecoded = await adminAuth.verifyIdToken(idToken);
      if (clientDecoded.uid !== uid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    // ---------- MUST EXIST IN `customers` COLLECTION ----------
    const snap = await adminDb
      .collection("customers")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "Please sign up first." }, // EXACT MESSAGE
        { status: 403 }
      );
    }

    // ---------- USER IS FULLY REGISTERED → ALLOW LOGIN ----------
    const customerData = snap.docs[0].data();
    const role = customerData.role || "student";

    const token = jwt.sign(
      { uid, email: normalizedEmail, role },
      JWT_SECRET,
      { expiresIn: rememberMe ? "365d" : "3d" }
    );

    const response = NextResponse.json({
      message: "Login successful",
      email: normalizedEmail,
      role,
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 3,
      sameSite: "strict",
    });

    response.headers.set("Access-Control-Allow-Origin", "https://yegnajobs.netlify.app");
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Please sign up first." },
      { status: 403 }
    );
  }
}

export const dynamic = "force-dynamic";
