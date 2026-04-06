import cron from 'node-cron';
import { db } from './firebase.js';
import { doc, setDoc, writeBatch, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { CLICKUP_IDS, SECTORS } from './src/constants.js';

const apiToken = process.env.CLICKUP_API_TOKEN;

async function fetchAllPages(url: string) {
  let allItems: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const pagedUrl = `${url}&page=${page}`;
    let retries = 3;
    let response;
    while (retries > 0) {
      try {
        response = await fetch(pagedUrl, {
          headers: { 
            "Authorization": apiToken!,
            "User-Agent": "Node.js/Fetch",
            "Connection": "keep-alive"
          }
        });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.ok) {
      console.error(`Failed to fetch ${pagedUrl}: ${response?.status}`);
      break;
    }

    const data = await response.json();
    if (data.tasks && data.tasks.length > 0) {
      allItems = [...allItems, ...data.tasks];
      if (page > 50) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  return allItems;
}

async function saveTasksInChunks(id: string, type: 'folder' | 'list', tasks: any[]) {
  console.log(`[Sync] Saving ${tasks.length} tasks for ${type} ${id} in chunks...`);
  
  // First, delete existing chunks for this id to avoid stale data
  try {
    const existingDocs = await getDocs(collection(db, `cache_${type}_${id}`));
    const deleteBatch = writeBatch(db);
    existingDocs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
  } catch (e) {
    console.error(`[Sync] Error deleting old chunks for ${type} ${id}:`, e);
  }

  const chunkSize = 200; // 200 tasks per chunk to stay well under 1MB
  const chunks = [];
  for (let i = 0; i < tasks.length; i += chunkSize) {
    chunks.push(tasks.slice(i, i + chunkSize));
  }

  const batch = writeBatch(db);
  for (let i = 0; i < chunks.length; i++) {
    const chunkRef = doc(db, `cache_${type}_${id}`, `chunk_${i}`);
    batch.set(chunkRef, { data: JSON.stringify(chunks[i]) });
  }
  
  if (chunks.length > 0) {
    await batch.commit();
  }
}

export async function runSync() {
  if (!apiToken) {
    console.error("[Sync] CLICKUP_API_TOKEN not found. Skipping sync.");
    return;
  }

  console.log("[Sync] Starting synchronization with ClickUp...");

  try {
    // 1. Sync Members
    console.log("[Sync] Fetching members...");
    const membersRes = await fetch("https://api.clickup.com/api/v2/team", {
      headers: { "Authorization": apiToken }
    });
    let teamId = null;
    if (membersRes.ok) {
      const membersData = await membersRes.json();
      await setDoc(doc(db, 'cache', 'members'), { data: JSON.stringify(membersData) });
      console.log("[Sync] Members synced.");
      if (membersData.teams && membersData.teams.length > 0) {
        teamId = membersData.teams[0].id;
      }
    }

    // 2. Sync Hierarchy
    if (teamId) {
      console.log(`[Sync] Fetching hierarchy for team ${teamId}...`);
      const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
        headers: { "Authorization": apiToken }
      });
      if (spacesRes.ok) {
        const spacesData = await spacesRes.json();
        const hierarchy = [];

        for (const space of spacesData.spaces) {
          const foldersRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
            headers: { "Authorization": apiToken }
          });
          const foldersData = await foldersRes.json();

          const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
            headers: { "Authorization": apiToken }
          });
          const listsData = await listsRes.json();

          hierarchy.push({
            ...space,
            folders: foldersData.folders,
            lists: listsData.lists
          });
        }
        await setDoc(doc(db, 'cache', `hierarchy_${teamId}`), { data: JSON.stringify({ hierarchy }) });
        console.log("[Sync] Hierarchy synced.");
      }
    }

    // 3. Sync Tasks for Folders
    for (const sector of SECTORS) {
      console.log(`[Sync] Fetching lists for folder ${sector.name} (${sector.id})...`);
      const listsRes = await fetch(`https://api.clickup.com/api/v2/folder/${sector.id}/list?archived=false`, {
        headers: { "Authorization": apiToken }
      });
      if (!listsRes.ok) continue;
      const listsData = await listsRes.json();
      const lists = listsData.lists || [];

      let allFolderTasks: any[] = [];
      for (const list of lists) {
        const listTaskUrl = `https://api.clickup.com/api/v2/list/${list.id}/task?subtasks=true&include_closed=true`;
        const tasks = await fetchAllPages(listTaskUrl);
        allFolderTasks = [...allFolderTasks, ...tasks];
      }

      await saveTasksInChunks(sector.id, 'folder', allFolderTasks);
    }

    // 4. Sync Tasks for specific Lists
    for (const [key, listId] of Object.entries(CLICKUP_IDS.LISTS)) {
      console.log(`[Sync] Fetching tasks for list ${key} (${listId})...`);
      const listTaskUrl = `https://api.clickup.com/api/v2/list/${listId}/task?subtasks=true&include_closed=true`;
      const tasks = await fetchAllPages(listTaskUrl);
      
      await saveTasksInChunks(listId, 'list', tasks);
    }

    console.log("[Sync] Synchronization completed successfully.");
  } catch (error) {
    console.error("[Sync] Error during synchronization:", error);
  }
}

// Schedule to run every 4 hours (6 times a day)
cron.schedule('0 */4 * * *', () => {
  runSync();
});
