import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export default async function hierarchyHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const apiToken = process.env.CLICKUP_API_TOKEN;
    if (!apiToken) {
      throw new Error("API Token not configured");
    }

    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const currentUrl = new URL(req.url || '', `${protocol}://${req.headers.host}`);
    const teamId = currentUrl.searchParams.get('team_id');

    if (!teamId) {
       throw new Error("Missing team_id");
    }

    // 1. Get Spaces
    console.log(`[Hierarchy] Fetching spaces for team ${teamId}...`);
    const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
      headers: { "Authorization": apiToken }
    });
    const spacesData = await spacesRes.json();
    
    const hierarchy = [];

    for (const space of spacesData.spaces) {
      // 2. Get Folders for each space
      const foldersRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
        headers: { "Authorization": apiToken }
      });
      const foldersData = await foldersRes.json();

      // 3. Get Folderless Lists for each space
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

    res.end(JSON.stringify({ hierarchy }));

  } catch (error: any) {
    console.error("[Hierarchy] Error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
