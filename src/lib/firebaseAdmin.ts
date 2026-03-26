import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!;
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      // Vercel can store literal newline characters inside the private_key
      // JSON string value. Fix by escaping newlines only within that field —
      // a blanket replace would also corrupt structural newlines between keys.
      const patched = raw.replace(
        /"private_key"\s*:\s*"([\s\S]*?)(?<!\\)"/,
        (_: string, key: string) => `"private_key": "${key.replace(/\r?\n/g, '\\n')}"`
      );
      serviceAccount = JSON.parse(patched);
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
