const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);`,
  `const __filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url || 'file://' + process.cwd() + '/server.ts');
const __dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename);`
);

fs.writeFileSync('server.ts', code);
