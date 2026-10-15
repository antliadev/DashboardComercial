import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;
let adminDb: Firestore | undefined;

export function getAdminApp(): App {
  if (!adminApp) {
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
    } else {
      const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (saKey) {
        try {
          const parsed = JSON.parse(saKey);
          adminApp = initializeApp({
            credential: cert(parsed),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashboard-comercial-a1e49",
          });
        } catch {
          adminApp = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashboard-comercial-a1e49",
          });
        }
      } else {
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashboard-comercial-a1e49",
        });
      }
    }
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}
