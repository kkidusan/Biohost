// lib/admin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initAdmin(): void {
  if (app) return; // Already initialized

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
}

export function getAdminAuth(): Auth {
  if (!auth) throw new Error("Admin Auth not initialized. Call initAdmin() first.");
  return auth;
}

export function getAdminDb(): Firestore {
  if (!db) throw new Error("Admin Firestore not initialized. Call initAdmin() first.");
  return db;
}