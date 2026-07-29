const fs = require('fs');
let code = fs.readFileSync('api/tasks.ts', 'utf8');

code = code.replace(
  `        const response = await fetch(finalUrl, {
          headers: { 
            "Authorization": apiToken,
            "User-Agent": "Node.js/Fetch",
            "Connection": "keep-alive"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(\`ClickUp API Error \${response.status}: \${errorText}\`);
        }

        const data = await response.json();
        res.end(JSON.stringify(data));
        return;`,
  `        let retries = 5;
        let response;
        while (retries > 0) {
          response = await fetch(finalUrl, {
            headers: { 
              "Authorization": apiToken,
              "User-Agent": "Node.js/Fetch",
              "Connection": "keep-alive"
            }
          });
          if (response.status === 429) {
            console.warn("[API] ClickUp Rate Limit reached in fallback. Retrying...");
            retries--;
            await new Promise(r => setTimeout(r, 10000));
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
