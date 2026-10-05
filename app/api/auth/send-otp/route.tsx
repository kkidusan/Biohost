// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "../../../firebaseconfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// === Nodemailer transporter (reused) ===
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false, // false for port 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || "wedajiemisgan8@gmail.com",
    pass: process.env.SMTP_PASS || "jyeanrvhygavytej",
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
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
    await addDoc(collection(db, "otps"), {
      email: normalizedEmail,
      otp,
      used: false,
      createdAt: serverTimestamp(),
      expiresAt: new Date(now + 5 * 60 * 1000),
    });

    // === Send email fastly ===
    try {
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || "Biruh Tutors"}" <${process.env.SMTP_USER || "wedajiemisgan8@gmail.com"}>`,
        to: normalizedEmail,
        subject: `Your Verification Code – ${process.env.APP_NAME || "Biruh Tutors"}`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #0c0a09; color: #f5f5f4;">
            <div style="background: #1c1917; border: 1px solid #292524; border-radius: 12px; padding: 30px; max-width: 400px; margin: 0 auto;">
              <h2 style="color: #f59e0b; margin-top: 0;">Biruh Tutors</h2>
              <p style="color: #a8a29e;">Your verification code is:</p>
              <h1 style="font-size: 36px; letter-spacing: 8px; color: #f59e0b; margin: 20px 0; font-family: monospace;">
                ${otp}
              </h1>
              <p style="color: #a8a29e; font-size: 13px;"><strong>Expires in 5 minutes</strong></p>
              <p style="color: #78716c; font-size: 11px; margin-top: 20px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
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
