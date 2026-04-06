import { db } from './src/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { CLICKUP_IDS, SECTORS } from './src/constants';

async function checkChunks() {
  try {
    for (const sector of SECTORS) {
      const coll = collection(db, `cache_folder_${sector.id}`);
      const snapshot = await getDocs(coll);
      console.log(`Folder ${sector.name} (${sector.id}): ${snapshot.docs.length} chunks`);
    }
    for (const [key, listId] of Object.entries(CLICKUP_IDS.LISTS)) {
      const coll = collection(db, `cache_list_${listId}`);
      const snapshot = await getDocs(coll);
      console.log(`List ${key} (${listId}): ${snapshot.docs.length} chunks`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkChunks();
