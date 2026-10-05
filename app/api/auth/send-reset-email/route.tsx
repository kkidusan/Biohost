// app/api/auth/send-reset-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "../../../lib/admin";

export async function POST(request: NextRequest) {
  try {
    initAdmin();
    const auth = getAuth();

    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    return NextResponse.json({ success: true, link }); // link for testing
  } catch (error: any) {
    console.error("Reset email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reset email" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
