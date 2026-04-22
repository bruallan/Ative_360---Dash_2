import fs from 'fs';

let content = fs.readFileSync('src/pages/PerformanceTime.tsx', 'utf-8');

// 1. Rename Component
content = content.replace('export default function PerformanceTime()', 'export default function PerformanceClientes()');

// 2. Change hook extraction
content = content.replace('const { tasks: allTasks, loading } = useData();', 'const { tasks: allTasks, loading, clients } = useData();');

// 3. Process data loop
const fetchMembersSection = `      // 1. Fetch Members
      const membersRes = await fetch('/api/members');
      const membersData = await membersRes.json();
      const members = membersData.teams?.[0]?.members?.map((m: any) => m.user) || [];
      
      if (members.length === 0) return;`;

const fetchClientsSection = `      // 1. Check Clients
      if (clients.length === 0) return;`;

content = content.replace(fetchMembersSection, fetchClientsSection);

const processMembersSectionStart = `      // 3. Process Data per Member
      const processedMembers = members.map((member: any) => {
        const memberTasks = allTasks.filter((t: any) => {
          return t.assignees?.some((a: any) => String(a.id) === String(member.id));
        });`;

const processClientsSectionStart = `      // 3. Process Data per Client
      const processedMembers = clients.map((client: string) => {
        const memberTasks = allTasks.filter((task: any) => {
          const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
          if (!clientField || (clientField.value === undefined || clientField.value === null)) return false;
          
          let clientName = '';
          if (clientField.type === 'drop_down') {
             const option = clientField.type_config?.options?.find((o: any) => 
               String(o.orderindex) === String(clientField.value) || 
               String(o.id) === String(clientField.value)
             );
             if (option) clientName = String(option.name);
          } else if (clientField.value) {
             clientName = String(clientField.value);
          }
          return clientName === client;
        });`;

content = content.replace(processMembersSectionStart, processClientsSectionStart);

// At the end of map where it returns the member object
const returnMemberSection = `        return {
          ...member,
          stats: { todo, active, completed, overdue },
          tasks: memberTasks
        };
      });`;

const returnClientSection = `        return {
          id: client,
          username: client,
          initials: client.substring(0, 2).toUpperCase(),
          profilePicture: null,
          color: '#e2e8f0', // default gray color
          stats: { todo, active, completed, overdue },
          tasks: memberTasks
        };
      });`;

content = content.replace(returnMemberSection, returnClientSection);


// Text replaces
content = content.replace('Performance do Time', 'Performance de Clientes');
content = content.replace('Acompanhe a performance individual dos colaboradores', 'Acompanhe a performance individual dos clientes');

fs.writeFileSync('src/pages/PerformanceClientes.tsx', content);
console.log('PerformanceClientes.tsx generated successfully.');
