const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const vite = await createViteServer\(\{[\s\n]*server: \{ middlewareMode: true \},[\s\n]*appType: "spa",[\s\n]*\}\);/g,
  `const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined
      },
      appType: "spa",
    });`
);

fs.writeFileSync('server.ts', code);
