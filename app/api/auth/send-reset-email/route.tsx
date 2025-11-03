// app/api/auth/send-reset-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "../../../lib/admin";

initAdmin();
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // Optionally: Send custom email via Nodemailer
    // But Firebase handles it automatically!

    return NextResponse.json({ success: true, link }); // link for testing
  } catch (error: any) {
    console.error("Reset email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reset email" },
      { status: 500 }
    );
  }
}