const fs = require('fs');
let code = fs.readFileSync('sync.ts', 'utf8');

const inheritanceLogic = `
    const allTeamTasks = await fetchAllPages(teamTaskUrl, apiToken);

    // Apply parent-to-subtask inheritance for the "Cliente" custom field
    const taskMap = new Map();
    allTeamTasks.forEach(t => taskMap.set(t.id, t));

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;
      for (const t of allTeamTasks) {
        if (t.parent) {
          const parentTask = taskMap.get(t.parent);
          if (parentTask) {
            const parentClientField = parentTask.custom_fields?.find(f => f.name === 'Cliente');
            const myClientField = t.custom_fields?.find(f => f.name === 'Cliente');
            
            if (parentClientField && (!myClientField || myClientField.value === undefined || myClientField.value === null)) {
              if (!t.custom_fields) t.custom_fields = [];
              t.custom_fields = t.custom_fields.filter(f => f.name !== 'Cliente');
              t.custom_fields.push(JSON.parse(JSON.stringify(parentClientField)));
              changed = true;
            }
          }
        }
      }
    }

    await saveTasksInChunks(teamId, 'team', allTeamTasks);
`;

code = code.replace(
  /const allTeamTasks = await fetchAllPages\(teamTaskUrl, apiToken\);\s*await saveTasksInChunks\(teamId, 'team', allTeamTasks\);/,
  inheritanceLogic.trim()
);

fs.writeFileSync('sync.ts', code);
