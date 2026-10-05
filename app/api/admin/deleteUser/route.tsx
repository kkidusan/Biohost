// app/api/admin/deleteUser/route.tsx
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ error: "Missing user uid" }, { status: 400 });
    }

    // 1. Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      console.warn("User not found in Firebase Auth or already deleted:", authErr);
    }

    // 2. Delete from Firestore customers collection
    await adminDb.collection("customers").doc(uid).delete();

    return NextResponse.json({ success: true, message: "User deleted from Auth and Firestore successfully" });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user" }, { status: 500 });
  }
}
