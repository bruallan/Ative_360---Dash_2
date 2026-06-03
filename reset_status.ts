import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const docRef = doc(db, 'cache', 'sync_status');
    await updateDoc(docRef, { status: 'idle', progress: 100, message: 'Reset executado (erro resolvido)', updatedAt: Date.now() });
    console.log('Reset completed');
    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}
run();
