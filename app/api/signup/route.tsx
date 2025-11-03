import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

// ---------- ADMIN SDK INITIALISATION ----------
let adminInited = false;
function initAdmin() {
  if (adminInited) return;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");

  const serviceAccount = JSON.parse(svc) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
    });
  }
  adminInited = true;
}
initAdmin();

const adminAuth = getAuth();
const adminDb = getFirestore();
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
  try {
    const { email, fullName } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

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
      createdAt: new Date().toISOString(),
    };
    await adminDb.collection("customers").doc(uid).set(userData, { merge: true });

    // ----- Create session cookie -----
    const sessionToken = jwt.sign(
      { uid, email },
      JWT_SECRET,
      { expiresIn: "3d" }
    );

    const response = NextResponse.json({
      message: "Signup successful",
      email,
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