import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Suppress benign Firebase gRPC idle timeout errors that clutter the logs
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("CANCELLED: Disconnecting idle stream")) {
    return; // Ignore this specific benign warning
  }
  originalConsoleError(...args);
};

// Import handlers
import clientLinksHandler from './api/client-links';
import membersHandler from './api/members';
import tasksHandler from './api/tasks';
import hierarchyHandler from './api/hierarchy';

// Import sync script to start cron job
import { runSync } from './sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Routes
  app.all("/api/client-links", (req, res) => {
    console.log(`[Server] API Request: ${req.method} ${req.url}`);
    return clientLinksHandler(req, res);
  });
  app.all("/api/members", (req, res) => {
    console.log(`[Server] API Request: ${req.method} ${req.url}`);
    return membersHandler(req, res);
  });
  app.all("/api/tasks", (req, res) => {
    console.log(`[Server] API Request: ${req.method} ${req.url}`);
    return tasksHandler(req, res);
  });
  app.all("/api/hierarchy", (req, res) => {
    console.log(`[Server] API Request: ${req.method} ${req.url}`);
    return hierarchyHandler(req, res);
  });

  app.post("/api/sync", async (req, res) => {
    // Manual trigger for sync
    runSync();
    res.json({ status: "Sync started in background" });
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
