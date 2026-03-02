import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export default async function tasksHandler(req: IncomingMessage, res: ServerResponse) {
  // Set JSON content type immediately
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log("[API] Starting request to ClickUp Tasks...");
    
    // Parse query parameters to get team_id
    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const currentUrl = new URL(req.url || '', `${protocol}://${req.headers.host}`);
    const teamId = currentUrl.searchParams.get('team_id');

    if (!teamId) {
      console.error("[API] No team_id provided");
      res.statusCode = 400;
      res.end(JSON.stringify({ 
        error: "Missing team_id parameter",
        details: "Please provide a team_id query parameter."
      }));
      return;
    }

    const apiToken = process.env.CLICKUP_API_TOKEN;
    
    if (!apiToken) {
      console.error("[API] No token found");
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: "API Token not configured in environment variables.",
        details: "Check your .env file."
      }));
      return;
    }

    // https://api.clickup.com/api/v2/team/{team_id}/task
    const url = `https://api.clickup.com/api/v2/team/${teamId}/task?page=0`;
    
    console.log(`[API] Fetching ${url}...`);
    const response = await fetch(url, {
      headers: {
        "Authorization": apiToken
      }
    });

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error body: ${errorText}`);
      res.statusCode = response.status;
      res.end(JSON.stringify({ 
        error: `ClickUp API Error: ${response.status}`, 
        details: errorText 
      }));
      return;
    }

    const data = await response.json();
    console.log("[API] Success. Returning data.");
    res.end(JSON.stringify(data));

  } catch (error: any) {
    console.error("[API] Exception:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: "Internal Server Error", 
      details: error.message 
    }));
  }
}
