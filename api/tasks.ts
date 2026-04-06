import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { db } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default async function tasksHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const currentUrl = new URL(req.url || '', `${protocol}://${req.headers.host}`);
    
    const folderId = currentUrl.searchParams.get('folder_id');
    const listId = currentUrl.searchParams.get('list_id');
    const page = currentUrl.searchParams.get('page') || '0';
    const includeSubtasks = currentUrl.searchParams.get('subtasks') || 'true';
    const archived = currentUrl.searchParams.get('archived') || 'false';

    let type = '';
    let id = '';
    if (folderId) {
      type = 'folder';
      id = folderId;
    } else if (listId) {
      type = 'list';
      id = listId;
    } else {
      throw new Error("Missing folder_id or list_id");
    }

    let tasks: any[] = [];
    let usedFallback = false;

    // Simple circuit breaker: if we know quota is exceeded, skip Firebase for a while
    const now = Date.now();
    const quotaExceededUntil = (global as any).firebaseQuotaExceededUntil || 0;

    try {
      if (now < quotaExceededUntil) {
        throw new Error("Quota previously exceeded (Circuit Breaker active)");
      }

      // If page > 0, return empty array because we fetch all tasks from Firebase at once
      if (parseInt(page) > 0) {
        res.end(JSON.stringify({ tasks: [] }));
        return;
      }

      console.log(`[API] Fetching tasks for ${type} ${id} from Firebase...`);
      const querySnapshot = await getDocs(collection(db, `cache_${type}_${id}`));
      
      querySnapshot.forEach(doc => {
        const chunkData = JSON.parse(doc.data().data);
        tasks = tasks.concat(chunkData);
      });

      if (tasks.length === 0) {
        throw new Error("Cache empty");
      }
    } catch (firebaseError: any) {
      const isQuotaError = 
        firebaseError.message?.includes("Quota limit exceeded") || 
        firebaseError.message?.includes("RESOURCE_EXHAUSTED") ||
        firebaseError.code === 'resource-exhausted';

      if (isQuotaError) {
        console.warn(`[API] Firebase Quota Exceeded. Activating circuit breaker for 30 minutes.`);
        (global as any).firebaseQuotaExceededUntil = now + 30 * 60 * 1000; // 30 minutes cooldown
      }
      
      console.log(`[API] Falling back to ClickUp API for ${type} ${id}...`);
      usedFallback = true;
      
      const apiToken = process.env.CLICKUP_API_TOKEN;
      if (!apiToken) throw new Error("API Token not configured");

      if (listId) {
        const url = `https://api.clickup.com/api/v2/list/${listId}/task`;
        const params = new URLSearchParams({
          page,
          subtasks: includeSubtasks,
          archived,
          include_closed: 'true',
        });
        if (currentUrl.searchParams.has('date_created_gt')) {
          params.append('date_created_gt', currentUrl.searchParams.get('date_created_gt')!);
        }
        if (currentUrl.searchParams.has('date_created_lt')) {
          params.append('date_created_lt', currentUrl.searchParams.get('date_created_lt')!);
        }
        
        const finalUrl = `${url}?${params.toString()}`;
        console.log(`[API] Fetching tasks from ClickUp: ${finalUrl}`);
        
        const response = await fetch(finalUrl, {
          headers: { 
            "Authorization": apiToken,
            "User-Agent": "Node.js/Fetch",
            "Connection": "keep-alive"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ClickUp API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        res.end(JSON.stringify(data));
        return; // Exit early since we already sent the response

      } else if (folderId) {
        // Fetch Lists
        const listsUrl = `https://api.clickup.com/api/v2/folder/${folderId}/list?archived=false`;
        const listsResponse = await fetch(listsUrl, {
          headers: { "Authorization": apiToken }
        });

        if (!listsResponse.ok) {
          const errorText = await listsResponse.text();
          throw new Error(`ClickUp API Error (Lists) ${listsResponse.status}: ${errorText}`);
        }

        const listsData = await listsResponse.json();
        const lists = listsData.lists || [];

        const allTasks = [];
        const batchSize = 3;
        
        for (let i = 0; i < lists.length; i += batchSize) {
          const batch = lists.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (list: any) => {
            const listTaskUrl = `https://api.clickup.com/api/v2/list/${list.id}/task`;
            const params = new URLSearchParams({
              page,
              subtasks: includeSubtasks,
              archived,
              include_closed: 'true',
            });
            
            if (currentUrl.searchParams.has('date_created_gt')) {
              params.append('date_created_gt', currentUrl.searchParams.get('date_created_gt')!);
            }
            if (currentUrl.searchParams.has('date_created_lt')) {
              params.append('date_created_lt', currentUrl.searchParams.get('date_created_lt')!);
            }

            const finalUrl = `${listTaskUrl}?${params.toString()}`;
            
            try {
              const response = await fetch(finalUrl, {
                headers: { 
                  "Authorization": apiToken,
                  "User-Agent": "Node.js/Fetch",
                  "Connection": "keep-alive"
                }
              });

              if (!response.ok) return [];
              const data = await response.json();
              return data.tasks || [];
            } catch (err) {
              return [];
            }
          });

          const results = await Promise.all(batchPromises);
          allTasks.push(...results.flat());
        }
        
        tasks = allTasks;
      }
    }

    if (!usedFallback || folderId) {
      // Optional: Filter by date if needed
      const dateCreatedGt = currentUrl.searchParams.get('date_created_gt');
      const dateCreatedLt = currentUrl.searchParams.get('date_created_lt');
      
      let filteredTasks = tasks;
      if (dateCreatedGt) {
        const gt = parseInt(dateCreatedGt);
        filteredTasks = filteredTasks.filter(t => parseInt(t.date_created) > gt);
      }
      if (dateCreatedLt) {
        const lt = parseInt(dateCreatedLt);
        filteredTasks = filteredTasks.filter(t => parseInt(t.date_created) < lt);
      }

      res.end(JSON.stringify({ tasks: filteredTasks }));
    }

  } catch (error: any) {
    console.error("[API] Error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
