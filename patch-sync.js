const fs = require('fs');
let code = fs.readFileSync('sync.ts', 'utf8');

code = code.replace(
  'await setDoc(chunkRef, { data: JSON.stringify(chunk) });',
  `let success = false;
    let retries = 5;
    while (!success && retries > 0) {
      try {
        await setDoc(chunkRef, { data: JSON.stringify(chunk) });
        success = true;
      } catch (err) {
        console.warn(\`[Sync] Chunk \${i} write failed (\${err.message}). Retrying...\`);
        retries--;
        await new Promise(res => setTimeout(res, 5000));
        if (retries === 0) throw err;
      }
    }`
);
code = code.replace('const maxBytes = 400000;', 'const maxBytes = 250000;');
code = code.replace('setTimeout(resolve, 3000)', 'setTimeout(resolve, 4000)');

fs.writeFileSync('sync.ts', code);
