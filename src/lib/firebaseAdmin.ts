import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!;
    // Vercel can store literal newlines inside the JSON string value —
    // re-escape them so JSON.parse doesn't choke on control characters.
    const serviceAccount = JSON.parse(raw.replace(/\n/g, '\\n'));
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
