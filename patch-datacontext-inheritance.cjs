const fs = require('fs');
let code = fs.readFileSync('src/context/DataContext.tsx', 'utf8');

const inheritanceLogic = `
      // Map tasks to sectors
      let tasksWithSector = spaceTasks.map((t: any) => {
        let sectorName = 'Outros';
        if (t.folder && !t.folder.hidden) {
          const foundSector = SECTORS.find(s => s.id === t.folder.id);
          if (foundSector) sectorName = foundSector.name;
        } else if (t.list) {
          if (t.list.id === CLICKUP_IDS.LISTS.ACC_REUNIOES || t.list.id === CLICKUP_IDS.LISTS.ACC_DEMANDAS) {
            sectorName = 'Account Manager';
          }
        }
        return { ...t, sector: sectorName };
      });

      // Merge without duplicates
      const taskMap = new Map();
      tasksWithSector.forEach((t: any) => taskMap.set(t.id, t));
      
      // Inherit properties from parent to subtasks
      // Subtasks might have parents that are also subtasks, so we process it iteratively until no more changes
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 5) {
        changed = false;
        iterations++;
        for (const [id, t] of taskMap.entries()) {
          if (t.parent) {
            const parentTask = taskMap.get(t.parent);
            if (parentTask) {
              // Inherit Cliente
              const parentClientField = parentTask.custom_fields?.find((f: any) => f.name === 'Cliente');
              const myClientField = t.custom_fields?.find((f: any) => f.name === 'Cliente');
              
              if (parentClientField && (!myClientField || myClientField.value === undefined || myClientField.value === null)) {
                if (!t.custom_fields) t.custom_fields = [];
                // Remove existing empty client field if any
                t.custom_fields = t.custom_fields.filter((f: any) => f.name !== 'Cliente');
                // Clone the parent's client field
                t.custom_fields.push(JSON.parse(JSON.stringify(parentClientField)));
                changed = true;
              }
              
              // Inherit sector if missing or 'Outros'
              if ((!t.sector || t.sector === 'Outros') && parentTask.sector && parentTask.sector !== 'Outros') {
                t.sector = parentTask.sector;
                changed = true;
              }
            }
          }
        }
      }

      const uniqueTasks = Array.from(taskMap.values());
`;

code = code.replace(
  /\/\/ Map tasks to sectors[\s\S]*?const uniqueTasks = Array\.from\(taskMap\.values\(\)\);/,
  inheritanceLogic.trim()
);

fs.writeFileSync('src/context/DataContext.tsx', code);
