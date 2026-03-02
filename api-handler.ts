import type { IncomingMessage, ServerResponse } from 'http';

export default async function membersHandler(req: IncomingMessage, res: ServerResponse) {
  // Set JSON content type immediately
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log("[API] Starting request to ClickUp...");
    
    // In Vite config context, process.env might need loading or is already available
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

    console.log("[API] Token found (masked):", apiToken.substring(0, 4) + "...");
    const url = "https://api.clickup.com/api/v2/team";
    
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
