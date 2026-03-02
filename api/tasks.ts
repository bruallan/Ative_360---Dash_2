import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export default async function tasksHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const apiToken = process.env.CLICKUP_API_TOKEN;
    if (!apiToken) {
      throw new Error("API Token not configured");
    }

    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const currentUrl = new URL(req.url || '', `${protocol}://${req.headers.host}`);
    
    // Parameters
    const teamId = currentUrl.searchParams.get('team_id');
    const folderId = currentUrl.searchParams.get('folder_id');
    const listId = currentUrl.searchParams.get('list_id');
    const includeSubtasks = currentUrl.searchParams.get('subtasks') || 'true';
    const archived = currentUrl.searchParams.get('archived') || 'false';
    const page = currentUrl.searchParams.get('page') || '0';

    let url = '';

    if (listId) {
      url = `https://api.clickup.com/api/v2/list/${listId}/task`;
      
      // Append query params
      const params = new URLSearchParams({
        page,
        subtasks: includeSubtasks,
        archived,
        include_closed: 'true', // We need closed tasks for stats
      });

      // Add date filters if provided
      if (currentUrl.searchParams.has('date_created_gt')) {
        params.append('date_created_gt', currentUrl.searchParams.get('date_created_gt')!);
      }
      if (currentUrl.searchParams.has('date_created_lt')) {
        params.append('date_created_lt', currentUrl.searchParams.get('date_created_lt')!);
      }
      
      // Fetch
      const finalUrl = `${url}?${params.toString()}`;
      console.log(`[API] Fetching tasks: ${finalUrl}`);
      
      const response = await fetch(finalUrl, {
        headers: { "Authorization": apiToken }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickUp API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      res.end(JSON.stringify(data));

    } else if (folderId) {
      // ClickUp API v2 does not support GET /folder/{id}/task directly.
      // We must fetch lists first, then fetch tasks for each list.
      
      // 1. Fetch Lists
      const listsUrl = `https://api.clickup.com/api/v2/folder/${folderId}/list?archived=false`;
      console.log(`[API] Fetching lists for folder: ${listsUrl}`);
      
      const listsResponse = await fetch(listsUrl, {
        headers: { "Authorization": apiToken }
      });

      if (!listsResponse.ok) {
        const errorText = await listsResponse.text();
        throw new Error(`ClickUp API Error (Lists) ${listsResponse.status}: ${errorText}`);
      }

      const listsData = await listsResponse.json();
      const lists = listsData.lists || [];

      // 2. Fetch Tasks for each List (in parallel)
      const taskPromises = lists.map(async (list: any) => {
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
        // console.log(`[API] Fetching tasks for list ${list.id}: ${finalUrl}`); // Too verbose
        
        const response = await fetch(finalUrl, {
          headers: { "Authorization": apiToken }
        });

        if (!response.ok) {
          console.error(`Failed to fetch tasks for list ${list.id}: ${response.status}`);
          return [];
        }

        const data = await response.json();
        return data.tasks || [];
      });

      const results = await Promise.all(taskPromises);
      const allTasks = results.flat();

      res.end(JSON.stringify({ tasks: allTasks }));

    } else if (teamId) {
      url = `https://api.clickup.com/api/v2/team/${teamId}/task`;
      // ... (existing logic for team if needed, but we focus on folder fix)
      // Re-implementing basic fetch for team to keep code clean if it was used
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
      const response = await fetch(finalUrl, { headers: { "Authorization": apiToken } });
      if (!response.ok) throw new Error(`ClickUp API Error ${response.status}`);
      const data = await response.json();
      res.end(JSON.stringify(data));

    } else {
      throw new Error("Missing team_id, folder_id, or list_id");
    }

  } catch (error: any) {
    console.error("[API] Error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
