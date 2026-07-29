const fs = require('fs');
let code = fs.readFileSync('src/pages/MacroOperations.tsx', 'utf8');

code = code.replace(
  `      // Find Client Name
      let clientName = 'Sem Cliente';
    const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
    
    if (clientField && clientField.value !== undefined && clientField.value !== null) {
      if (clientField.type === 'drop_down') {
         const option = clientField.type_config?.options?.find((o: any) =>
            String(o.orderindex) === String(clientField.value) ||
            String(o.id) === String(clientField.value)
         );
         if (option) clientName = String(option.name);
      } else if (clientField.value) {
         clientName = String(clientField.value);
      }
    }

      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, { name: clientName, gt: [], gc: [], design: [] });
      }
      const row = clientsMap.get(clientName)!;`,
  `      // Find Client Names
      let clientNames = [];
      const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
      
      if (clientField && clientField.value !== undefined && clientField.value !== null) {
        if (clientField.type === 'drop_down') {
           const option = clientField.type_config?.options?.find((o: any) =>
              String(o.orderindex) === String(clientField.value) ||
              String(o.id) === String(clientField.value)
           );
           if (option) clientNames.push(String(option.name));
        } else if (clientField.type === 'labels') {
           if (Array.isArray(clientField.value)) {
               clientField.value.forEach((val) => {
                   const option = clientField.type_config?.options?.find((o: any) => String(o.id) === String(val));
                   if (option) clientNames.push(String(option.label || option.name));
               });
           }
        } else if (clientField.value) {
           clientNames.push(String(clientField.value));
        }
      }
      if (clientNames.length === 0) clientNames.push('Sem Cliente');

      clientNames.forEach(clientName => {
        if (!clientsMap.has(clientName)) {
          clientsMap.set(clientName, { name: clientName, gt: [], gc: [], design: [] });
        }
        const row = clientsMap.get(clientName)!;`
);

code = code.replace(
  `      // Push task to correct cell
      if (listName.toLowerCase().includes('trafego') || listName.toLowerCase().includes('tráfego') || folderName.toLowerCase().includes('tráfego')) {
        row.gt.push(task);
      } else if (listName.toLowerCase().includes('conteudo') || listName.toLowerCase().includes('conteúdo') || folderName.toLowerCase().includes('conteúdo')) {
        row.gc.push(task);
      } else if (listName.toLowerCase().includes('design')) {
        row.design.push(task);
      }
    });`,
  `      // Push task to correct cell
        if (listName.toLowerCase().includes('trafego') || listName.toLowerCase().includes('tráfego') || folderName.toLowerCase().includes('tráfego')) {
          row.gt.push(task);
        } else if (listName.toLowerCase().includes('conteudo') || listName.toLowerCase().includes('conteúdo') || folderName.toLowerCase().includes('conteúdo')) {
          row.gc.push(task);
        } else if (listName.toLowerCase().includes('design')) {
          row.design.push(task);
        }
      });
    });`
);
fs.writeFileSync('src/pages/MacroOperations.tsx', code);
