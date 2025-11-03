import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, updatePassword,  } from "../../firebaseconfig";

const JWT_SECRET = process.env.JWT_SECRET;

function validatePassword(password: string) {
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Password requires an uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Password requires a lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Password requires a number" };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, error: "Password requires a special character" };
  return { valid: true };
}

interface ErrorWithCode extends Error {
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string };
    const { email, currentPassword, newPassword } = await request.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (decoded.email !== email) {
      return NextResponse.json({ error: "You can only change your own password" }, { status: 403 });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Reauthenticate user
    const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
    const user = userCredential.user;

    // Update password
    await updatePassword(user, newPassword);

    // Clear the session token since password was changed
    const response = NextResponse.json({
      success: true,
      message: `Password updated successfully for ${decoded.role}. Please log in again.`,
    });

    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    });

    return response;

  } catch (error: unknown) {
    console.error("Change password error:", error);

    const err = error as ErrorWithCode;
    let message = "Failed to update password";
    let status = 500;

    switch (err.code) {
      case "auth/wrong-password":
        message = "Current password is incorrect";
        status = 401;
        break;
      case "auth/requires-recent-login":
        message = "Please log in again to change your password";
        status = 401;
        break;
      case "auth/weak-password":
        message = "Password does not meet security requirements";
        status = 400;
        break;
      case "auth/too-many-requests":
        message = "Too many failed attempts. Please try again later";
        status = 429;
        break;
      default:
        if (err.message) {
          message = err.message;
        }
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export const dynamic = "force-dynamic";