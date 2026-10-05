// lib/admin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initAdmin(): void {
  if (app) return; // Already initialized

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!privateKey && process.env.FIREBASE_PRIVATE_KEY_B64) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, "base64").toString("utf8");
        if (decoded.includes("BEGIN PRIVATE KEY")) {
          privateKey = decoded;
        }
      } catch (e) {
        console.error("Error decoding FIREBASE_PRIVATE_KEY_B64:", e);
      }
    }

    if (!projectId || !clientEmail || !privateKey || privateKey.includes("...")) {
      console.warn("Firebase Admin credentials not fully configured or truncated. Skipping admin initialization during build.");
      return;
    }

    // === Robust PEM Private Key Formatting for OpenSSL 3 / Node.js ===
    if (privateKey) {
      privateKey = privateKey.replace(/^["'](.*)["']$/, '$1').trim();
      privateKey = privateKey.replace(/\\n/g, '\n');

      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";

      if (privateKey.includes(header) && privateKey.includes(footer)) {
        const body = privateKey
          .substring(privateKey.indexOf(header) + header.length, privateKey.indexOf(footer))
          .replace(/\s+/g, "");

        const chunks = [];
        for (let i = 0; i < body.length; i += 64) {
          chunks.push(body.substring(i, i + 64));
        }
        privateKey = `${header}\n${chunks.join("\n")}\n${footer}`;
      }
    }

    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

export function getAdminAuth(): Auth {
  if (!auth) initAdmin();
  if (!auth) throw new Error("Admin Auth not initialized. Check server environment variables.");
  return auth;
}

export function getAdminDb(): Firestore {
  if (!db) initAdmin();
  if (!db) throw new Error("Admin Firestore not initialized. Check server environment variables.");
  return db;
}
