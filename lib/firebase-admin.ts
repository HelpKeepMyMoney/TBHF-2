import admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

let adminDb: Firestore | null = null;

function ensureAdminInitialized(): boolean {
  if (admin.apps.length > 0) return true;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return false;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: formatPrivateKey(privateKey),
    }),
    projectId,
  });
  return true;
}

export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;
  if (!ensureAdminInitialized()) return null;
  adminDb = admin.firestore();
  return adminDb;
}

export function getAdminAuth(): Auth | null {
  if (!ensureAdminInitialized()) return null;
  return admin.auth();
}
