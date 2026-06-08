import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || 'url-s-c6e4d';
const isHostedEnvironment = process.env.VERCEL === '1'
  || process.env.NODE_ENV === 'production';

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const value = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return {
        projectId: value.project_id || value.projectId,
        clientEmail: value.client_email || value.clientEmail,
        privateKey: String(value.private_key || value.privateKey || '').replace(/\\n/g, '\n')
      };
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must contain valid service account JSON');
    }
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  return null;
}

const serviceAccount = getServiceAccount();
const hasApplicationDefaultCredentials = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
  || process.env.FIRESTORE_EMULATOR_HOST
);

export const firebaseConfigurationError = isHostedEnvironment
  && !serviceAccount
  && !hasApplicationDefaultCredentials
  ? 'Firebase Admin credentials are missing. Add FIREBASE_SERVICE_ACCOUNT_KEY to Vercel Environment Variables.'
  : null;

let firestore: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (firebaseConfigurationError) {
    throw new Error(firebaseConfigurationError);
  }

  if (firestore) {
    return firestore;
  }

  const app = getApps()[0] || initializeApp({
    projectId,
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    storageBucket: 'url-s-c6e4d.firebasestorage.app'
  });

  firestore = getFirestore(app);
  return firestore;
}
