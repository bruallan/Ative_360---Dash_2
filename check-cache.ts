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

async function check() {
  const db = getDb();
  const docs = await db.collection('cache_team_9013412527').get();
  console.log(`Found ${docs.size} chunks.`);
  let count = 0;
  docs.forEach(d => {
      const data = JSON.parse(d.data().data);
      count += data.length;
  });
  console.log(`Total tasks in cache: ${count}`);
}
check().catch(console.error);
