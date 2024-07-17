import admin from 'firebase-admin';
import { getStorage, Storage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing Firebase Admin SDK environment variables');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),

    storageBucket: `gs://borsaliyorum-7da89.appspot.com`,
  });
}

const auth = admin.auth();
const storage: Storage = getStorage();
const storageBucket = admin.storage().bucket();

export { auth, storage, storageBucket };
