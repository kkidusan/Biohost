import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBcMvfj3tSEyaL8bm0Zrm2hbvC0ZLkK4X0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "biography-2967e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "biography-2967e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "biography-2967e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "668367066925",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:668367066925:web:6c2dd021e1795f578825a4",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EXRMD92FG0",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let analytics = null;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;
if (typeof window !== "undefined" && apiKey && !apiKey.includes("Dummy")) {
  try {
    analytics = getAnalytics(app);
  } catch {
    console.warn("Analytics not supported in this environment");
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

setLogLevel("silent");

const googleProvider = new GoogleAuthProvider();

export function formatFirebaseError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes("api-key-not-valid") || msg.includes("API key not valid") || msg.includes("installations/request-failed")) {
    return "Invalid Firebase API Key. Please verify your NEXT_PUBLIC_FIREBASE_API_KEY in your .env file.";
  }
  return msg;
}

export { app, auth, db, googleProvider, analytics, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword };
