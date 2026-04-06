import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { doc, getDoc } from 'firebase/firestore';

export default async function hierarchyHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const currentUrl = new URL(req.url || '', `${protocol}://${req.headers.host}`);
    const teamId = currentUrl.searchParams.get('team_id');

    if (!teamId) {
       throw new Error("Missing team_id");
    }

    const now = Date.now();
    const quotaExceededUntil = (global as any).firebaseQuotaExceededUntil || 0;

    try {
      if (now < quotaExceededUntil) {
        throw new Error("Quota previously exceeded (Circuit Breaker active)");
      }

      let db: any = null;
      try {
        const firebaseModule = await import('../src/firebase.js');
        db = firebaseModule.db;
      } catch (importError) {
        console.warn("[API] Could not load Firebase module, bypassing cache:", importError);
        throw new Error("Firebase module load failed");
      }

      console.log(`[Hierarchy] Fetching hierarchy for team ${teamId} from Firebase...`);
      const docRef = doc(db, 'cache', `hierarchy_${teamId}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = JSON.parse(docSnap.data().data);
        res.end(JSON.stringify(data));
        return;
      } else {
        throw new Error("Cache empty");
      }
    } catch (firebaseError: any) {
      const isQuotaError = 
        firebaseError.message?.includes("Quota limit exceeded") || 
        firebaseError.message?.includes("RESOURCE_EXHAUSTED") ||
        firebaseError.code === 'resource-exhausted';

      if (isQuotaError) {
        console.warn(`[Hierarchy] Firebase Quota Exceeded. Activating circuit breaker for 30 minutes.`);
        (global as any).firebaseQuotaExceededUntil = now + 30 * 60 * 1000; // 30 minutes cooldown
      }
      console.log("[Hierarchy] Falling back to ClickUp API...");
      
      const apiToken = process.env.CLICKUP_API_TOKEN;
      if (!apiToken) throw new Error("API Token not configured");

      console.log(`[Hierarchy] Fetching spaces for team ${teamId}...`);
      const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
        headers: { "Authorization": apiToken }
      });
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

      res.end(JSON.stringify({ hierarchy }));
    }

  } catch (error: any) {
    console.error("[Hierarchy] Error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
