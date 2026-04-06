import { execSync } from 'child_process';
console.log(execSync('git log -p src/components/Sidebar.tsx | grep -B 2 -A 2 "<img"').toString());
