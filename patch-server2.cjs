const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const __filename = typeof __filename .*;/g,
  ''
);
code = code.replace(
  /const __dirname = typeof __dirname .*;/g,
  ''
);

code = code.replace(
  /path\.resolve\(__dirname,\s*'dist'\)/g,
  "path.join(process.cwd(), 'dist')"
);

fs.writeFileSync('server.ts', code);
