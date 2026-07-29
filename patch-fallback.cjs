const fs = require('fs');
let code = fs.readFileSync('api/tasks.ts', 'utf8');

code = code.replace(
  'const response = await fetch(finalUrl, {',
  `let retries = 5;
        let response;
        while (retries > 0) {
          response = await fetch(finalUrl, {`
);

code = code.replace(
  `        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(\`ClickUp API Error \${response.status}: \${errorText}\`);
        }

        const data = await response.json();
        res.end(JSON.stringify(data));
        return;`,
  `        if (response.status === 429) {
            console.warn("[API] ClickUp Rate Limit reached in fallback. Retrying...");
            retries--;
            await new Promise(r => setTimeout(r, 6000));
            continue;
          }
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`ClickUp API Error \${response.status}: \${errorText}\`);
          }
          break;
        }
        
        if (!response || !response.ok) {
           throw new Error("Failed to fetch from ClickUp after retries");
        }

        const data = await response.json();
        res.end(JSON.stringify(data));
        return;`
);

fs.writeFileSync('api/tasks.ts', code);
