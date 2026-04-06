import { execSync } from 'child_process';
try {
  const log = execSync('git log -p src/components/Sidebar.tsx | grep -i "logo"').toString();
  console.log(log);
} catch (e) {
  console.error(e.message);
}
