import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../src/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export default async function membersHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const now = Date.now();
    const quotaExceededUntil = (global as any).firebaseQuotaExceededUntil || 0;

    try {
      if (now < quotaExceededUntil) {
        throw new Error("Quota previously exceeded (Circuit Breaker active)");
      }

      console.log("[API] Fetching members from Firebase...");
      const docRef = doc(db, 'cache', 'members');
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
        console.warn(`[API] Firebase Quota Exceeded. Activating circuit breaker.`);
        (global as any).firebaseQuotaExceededUntil = now + 30 * 60 * 1000; // 30 minutes
      }
      console.log("[API] Falling back to ClickUp API for members...");
      
      const apiToken = process.env.CLICKUP_API_TOKEN;
      if (!apiToken) throw new Error("API Token not configured in environment variables.");

      const url = "https://api.clickup.com/api/v2/team";
      const response = await fetch(url, {
        headers: {
          "Authorization": apiToken,
          "User-Agent": "Node.js/Fetch",
          "Connection": "keep-alive"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickUp API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      res.end(JSON.stringify(data));
    }
  } catch (error: any) {
    console.error("[API] Exception:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: "Internal Server Error", 
      details: error.message 
    }));
  }
}
