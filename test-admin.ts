import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

function getDb() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: config.projectId
    });
  }
  return getFirestore(undefined, config.firestoreDatabaseId);
}

async function test() {
  const db = getDb();
  await db.collection('test').doc('test').set({ hello: 'world' });
  console.log('Admin SDK works');
}
test().catch(console.error);
