import * as admin from 'firebase-admin';
import * as fs from 'fs';

const projectId = "gen-lang-client-0491037568";
admin.initializeApp({ projectId });

async function deploy() {
  try {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    // Using unauthenticated admin SDK might fail if it requires credentials.
    // Let's see if the environment injects GOOGLE_APPLICATION_CREDENTIALS.
    console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
deploy();
