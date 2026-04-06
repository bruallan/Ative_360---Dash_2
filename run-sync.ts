import { runSync } from './sync.js';

runSync().then(() => {
  console.log("Initial sync finished");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
