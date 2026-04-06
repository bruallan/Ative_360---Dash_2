import { runSync } from './sync.js';

async function execute() {
  try {
    console.log("Starting one-off sync from GitHub Actions...");
    await runSync();
    console.log("Sync completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
}

execute();
