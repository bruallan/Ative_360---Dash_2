import { db } from './src/firebase';
import { doc, setDoc, writeBatch, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { CLICKUP_IDS, SECTORS } from './src/constants';

const apiToken = process.env.CLICKUP_API_TOKEN;

async function updateSyncStatus(status: string, progress: number, message: string) {
  try {
    await setDoc(doc(db, 'cache', 'sync_status'), {
      status,
      progress,
      message,
      updatedAt: Date.now()
    });
  } catch (e: any) {
    if (e.message?.includes("Quota limit exceeded") || e.code === 'resource-exhausted') {
      console.warn("[Sync] Quota exceeded while updating status. Stopping status updates.");
      return;
    }
    console.error("[Sync] Error updating status:", e);
  }
}

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

  // Dynamic chunking based on size
  const maxBytes = 850000; // 850KB limit (Firestore is 1MB, leaving margin for overhead)
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  let currentSize = 0;

  for (const task of tasks) {
    const taskStr = JSON.stringify(task);
    const taskSize = taskStr.length; // Approximation of bytes

    if (currentSize + taskSize > maxBytes && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(task);
    currentSize += taskSize;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  console.log(`[Sync] Split into ${chunks.length} chunks.`);

  // Use batches to save chunks (max 500 operations per batch)
  const MAX_BATCH_SIZE = 400;
  for (let i = 0; i < chunks.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunkSlice = chunks.slice(i, i + MAX_BATCH_SIZE);
    
    chunkSlice.forEach((chunk, index) => {
      const globalIndex = i + index;
      const chunkRef = doc(db, `cache_${type}_${id}`, `chunk_${globalIndex}`);
      batch.set(chunkRef, { data: JSON.stringify(chunk) });
    });
    
    if (chunkSlice.length > 0) {
      await batch.commit();
    }
  }
}

export async function runSync() {
  if (!apiToken) {
    console.error("[Sync] CLICKUP_API_TOKEN not found. Skipping sync.");
    await updateSyncStatus('error', 0, 'CLICKUP_API_TOKEN not found');
    return;
  }

  console.log("[Sync] Starting synchronization with ClickUp...");
  await updateSyncStatus('running', 5, 'Iniciando sincronização...');

  try {
    // 1. Sync Members
    console.log("[Sync] Fetching members...");
    await updateSyncStatus('running', 10, 'Sincronizando membros da equipe...');
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
      await updateSyncStatus('running', 20, 'Sincronizando hierarquia de pastas...');
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
    const totalSectors = SECTORS.length;
    for (let i = 0; i < totalSectors; i++) {
      const sector = SECTORS[i];
      console.log(`[Sync] Fetching lists for folder ${sector.name} (${sector.id})...`);
      
      const progress = 30 + Math.floor((i / totalSectors) * 40); // 30% to 70%
      await updateSyncStatus('running', progress, `Sincronizando tarefas: ${sector.name}...`);

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
    const listEntries = Object.entries(CLICKUP_IDS.LISTS);
    const totalLists = listEntries.length;
    for (let i = 0; i < totalLists; i++) {
      const [key, listId] = listEntries[i];
      console.log(`[Sync] Fetching tasks for list ${key} (${listId})...`);
      
      const progress = 70 + Math.floor((i / totalLists) * 25); // 70% to 95%
      await updateSyncStatus('running', progress, `Sincronizando lista: ${key}...`);

      const listTaskUrl = `https://api.clickup.com/api/v2/list/${listId}/task?subtasks=true&include_closed=true`;
      const tasks = await fetchAllPages(listTaskUrl);
      
      await saveTasksInChunks(listId, 'list', tasks);
    }

    console.log("[Sync] Synchronization completed successfully.");
    await updateSyncStatus('idle', 100, 'Sincronização concluída com sucesso!');
  } catch (error: any) {
    console.error("[Sync] Error during synchronization:", error);
    await updateSyncStatus('error', 0, `Erro: ${error.message}`);
  }
}

