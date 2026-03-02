import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Routes
  app.get("/api/members", async (req, res) => {
    try {
      console.log("[API] Starting request to ClickUp...");
      
      const apiToken = process.env.CLICKUP_API_TOKEN;
      
      if (!apiToken) {
        console.error("[API] No token found");
        return res.status(500).json({ 
          error: "API Token not configured in environment variables.",
          details: "Check your .env file."
        });
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
        return res.status(response.status).json({ 
          error: `ClickUp API Error: ${response.status}`, 
          details: errorText 
        });
      }

      const data = await response.json();
      console.log("[API] Success. Returning data.");
      res.json(data);

    } catch (error: any) {
      console.error("[API] Exception:", error);
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message 
      });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicitly handle 404 for API routes to avoid falling back to index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Endpoint Not Found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
