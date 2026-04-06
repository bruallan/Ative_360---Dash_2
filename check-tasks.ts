import { db } from './src/firebase.js';
import { collection, getCountFromServer } from 'firebase/firestore';

async function checkTasks() {
  try {
    const coll = collection(db, 'tasks');
    const snapshot = await getCountFromServer(coll);
    console.log('Total tasks in Firestore:', snapshot.data().count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTasks();
