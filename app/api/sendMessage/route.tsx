// app/api/sendMessage/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, bookTitle, chapterTitle, published } = await req.json();

    if (!email || !bookTitle || !chapterTitle) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // FIXED: Use Gmail service instead of raw SMTP options
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD, // App Password
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const statusText = published ? "Published" : "Unpublished";
    const subject = published
      ? `Chapter Published: ${chapterTitle}`
      : `Chapter Unpublished: ${chapterTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; background:#f5f3ff; padding:25px;">
        <div style="background:white; border-radius:12px; padding:25px; border:1px solid #ddd;">
          <h2 style="color:#6d28d9; margin-top:0;">Bio Host Notification</h2>
          <p style="font-size:16px; color:#333;">Hello <strong>${email.split("@")[0]}</strong>,</p>
          <p style="font-size:16px; color:#333;">Your chapter status has changed:</p>
          <div style="background:#eef2ff; border-left:4px solid #6366f1; padding:12px; border-radius:6px; margin:15px 0;">
            <p style="margin:0; font-size:15px;">
              <strong>Book:</strong> ${bookTitle}<br/>
              <strong>Chapter:</strong> ${chapterTitle}<br/>
              <strong>Status:</strong> ${statusText}
            </p>
          </div>
          <p style="font-size:15px; color:#444;">Keep writing — your story matters.</p>
          <p style="font-size:12px; color:#999; margin-top:20px;">Bio Host | Powered by creativity</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Bio Host" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Email error:", err);
    return NextResponse.json(
      { error: "Email failed", details: err.message },
      { status: 500 }
    );
  }
}