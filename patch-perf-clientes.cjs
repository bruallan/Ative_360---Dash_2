const fs = require('fs');
let code = fs.readFileSync('src/pages/PerformanceClientes.tsx', 'utf8');

code = code.replace(
  `          let clientName = '';
          if (clientField.type === 'drop_down') {
             const option = clientField.type_config?.options?.find((o: any) =>
                String(o.orderindex) === String(clientField.value) ||
                String(o.id) === String(clientField.value)
             );
             if (option) clientName = String(option.name);
          } else if (clientField.value) {
             clientName = String(clientField.value);
          }

          return clientName === client;`,
  `          let clientNames = [];
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

          return clientNames.includes(client);`
);

fs.writeFileSync('src/pages/PerformanceClientes.tsx', code);
