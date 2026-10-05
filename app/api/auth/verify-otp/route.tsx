// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../firebaseconfig";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json(
        { error: "Email and 6-digit OTP required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const q = query(
      collection(db, "otps"),
      where("email", "==", normalizedEmail),
      where("otp", "==", otp),
      where("used", "==", false)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    // Check expiry
    if (data.expiresAt.toDate() < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    // Mark as used
    await updateDoc(docSnap.ref, { used: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("OTP Verify Error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}