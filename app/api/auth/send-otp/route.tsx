// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initAdmin, getAdminDb } from "../../../lib/admin";
import { FieldValue } from "firebase-admin/firestore";

// === Initialize on first request ===
initAdmin();
const adminDb = getAdminDb();

// === Nodemailer transporter (reused) ===
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// === Rate limiter: 1 OTP per minute per email ===
const RATE_LIMIT = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // === Validate email ===
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // === Rate limiting ===
    const now = Date.now();
    const lastSent = RATE_LIMIT.get(normalizedEmail) ?? 0;
    if (now - lastSent < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "Too many requests. Wait 1 minute." },
        { status: 429 }
      );
    }

    // === Generate 6-digit OTP ===
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // === Store OTP in Firestore (5 min expiry) ===
    await adminDb.collection("otps").add({
      email: normalizedEmail,
      otp,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(now + 5 * 60 * 1000),
    });

    // === Send email ===
    try {
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || "MyApp"}" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: `Your OTP Code – ${process.env.APP_NAME || "MyApp"}`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #6b46c1;">${process.env.APP_NAME || "MyApp"}</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; color: #1d3557; margin: 20px 0;">
              ${otp}
            </h1>
            <p><strong>Expires in 5 minutes</strong></p>
            <p style="color: #666; font-size: 12px;">
              If you didn't request this, ignore this email.
            </p>
          </div>
        `,
      });
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      return NextResponse.json(
        { error: "Failed to send OTP email" },
        { status: 500 }
      );
    }

    // === Update rate limit ===
    RATE_LIMIT.set(normalizedEmail, now);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("OTP Send Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}