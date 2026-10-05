// lib/firebaseAdmin.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey && process.env.FIREBASE_PRIVATE_KEY_B64) {
    try {
      privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, "base64").toString("utf8");
    } catch (e) {
      console.error("Error decoding FIREBASE_PRIVATE_KEY_B64:", e);
    }
  }

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

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
