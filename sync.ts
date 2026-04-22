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

function cleanTask(task: any) {
  // Only keep the fields we actually use in the UI to save space
  return {
    id: task.id,
    name: task.name,
    status: task.status ? {
      status: task.status.status,
      color: task.status.color,
      type: task.status.type
    } : undefined,
    due_date: task.due_date,
    date_created: task.date_created,
    date_closed: task.date_closed,
    assignees: task.assignees?.map((a: any) => ({
      id: a.id,
      username: a.username,
      color: a.color,
      initials: a.initials,
      profilePicture: a.profilePicture
    })),
    list: task.list ? {
      id: task.list.id,
      name: task.list.name
    } : undefined,
    folder: task.folder ? {
      id: task.folder.id,
      name: task.folder.name,
      hidden: task.folder.hidden
    } : undefined,
    custom_fields: task.custom_fields?.filter((f: any) => f.name === 'Cliente').map((f: any) => ({
      name: f.name,
      value: f.value,
      type: f.type,
      type_config: f.type_config
    })),
    url: task.url,
    creator: task.creator ? {
      username: task.creator.username,
      color: task.creator.color,
      initials: task.creator.initials,
      profilePicture: task.creator.profilePicture
    } : undefined
  };
}

async function saveTasksInChunks(id: string, type: 'folder' | 'list', tasks: any[]) {
  console.log(`[Sync] Saving ${tasks.length} tasks for ${type} ${id} in chunks...`);
  
  // Clean tasks before saving to reduce size
  const cleanedTasks = tasks.map(cleanTask);
  
  // First, delete existing chunks for this id to avoid stale data
  try {
    const existingDocs = await getDocs(collection(db, `cache_${type}_${id}`));
    for (const d of existingDocs.docs) {
      await deleteDoc(d.ref);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to prevent RESOURCE_EXHAUSTED
    }
  } catch (e) {
    console.error(`[Sync] Error deleting old chunks for ${type} ${id}:`, e);
  }

  // Dynamic chunking based on size
  const maxBytes = 400000; // 400KB limit to prevent RESOURCE_EXHAUSTED
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  let currentSize = 0;

  for (const task of cleanedTasks) {
    const taskStr = JSON.stringify(task);
    const taskSize = taskStr.length; // Approximation of bytes

    // If a single task is somehow still > 400KB, skip it with a warning
    if (taskSize > maxBytes) {
      console.warn(`[Sync] Task ${task.id} is too large (${taskSize} bytes) even after cleaning. Skipping.`);
      continue;
    }

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

  // Write chunks one by one with a delay to prevent RESOURCE_EXHAUSTED
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkRef = doc(db, `cache_${type}_${id}`, `chunk_${i}`);
    
    console.log(`[Sync] Saving chunk ${i + 1}/${chunks.length}...`);
    await setDoc(chunkRef, { data: JSON.stringify(chunk) });
    
    // Add a 3-second delay between chunks to prevent overwhelming the write stream
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
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

    // 3. Sync Tasks for Gestão and Operação spaces
    console.log(`[Sync] Fetching tasks for spaces Gestão and Operação via Team endpoint...`);
    await updateSyncStatus('running', 30, `Buscando tarefas de Gestão e Operação...`);

    if (!teamId) {
      throw new Error("Team ID not found, cannot fetch tasks.");
    }

    // Using 1500000000000 (July 2017) to ensure we get all historical tasks
    const spaceGestao = CLICKUP_IDS.SPACE_GESTAO;
    const spaceOperacao = CLICKUP_IDS.SPACE_OPERACAO;
    const teamTaskUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?space_ids[]=${spaceGestao}&space_ids[]=${spaceOperacao}&subtasks=true&include_closed=true&date_created_gt=1500000000000`;
    const allTeamTasks = await fetchAllPages(teamTaskUrl);

    await saveTasksInChunks(teamId, 'team', allTeamTasks);

    console.log("[Sync] Synchronization completed successfully.");
    await updateSyncStatus('idle', 100, 'Sincronização concluída com sucesso!');
  } catch (error: any) {
    console.error("[Sync] Error during synchronization:", error);
    await updateSyncStatus('error', 0, `Erro: ${error.message}`);
  }
}

