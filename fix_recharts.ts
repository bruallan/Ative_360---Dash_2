import fs from 'fs';

const files = [
  'src/pages/Overview.tsx', 
  'src/pages/PerformanceTime.tsx', 
  'src/pages/ClientPanel.tsx', 
  'src/pages/PerformanceClientes.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<ResponsiveContainer width=\"100%\" height=\"100%\" minWidth=\{0\} minHeight=\{0\}>/g, '<ResponsiveContainer width="100%" height={300}>');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
