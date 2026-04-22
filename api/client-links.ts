import { IncomingMessage, ServerResponse } from 'http';

// Helper to get body
const getBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
};

export default async function clientLinksHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  const apiToken = process.env.CLICKUP_API_TOKEN;
  // Hardcode the list ID to ensure it works, ignoring any potentially invalid env var
  const configListId = '901326190559';

  if (!apiToken) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'CLICKUP_API_TOKEN not configured' }));
    return;
  }

  if (!configListId) {
    if (req.method === 'GET') {
      res.end(JSON.stringify({}));
      return;
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: 'CLICKUP_CONFIG_LIST_ID not configured.' 
      }));
      return;
    }
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task?archived=false&include_closed=true`, {
        headers: { 'Authorization': apiToken }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ClickUp API Error (GET): ${response.status} - ${errorText}`);
        throw new Error(`ClickUp API Error: ${response.status}`);
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      const links: Record<string, string> = {};
      tasks.forEach((task: any) => {
        const embedField = task.custom_fields?.find((f: any) => f.id === '833454be-cd31-4eb6-9b9d-64496b2740d0');
        if (embedField && embedField.value) {
          links[task.name.trim()] = String(embedField.value).trim();
        } else if (task.description) {
          // Fallback if not in custom field
          links[task.name.trim()] = task.description.trim();
        }
      });

      res.end(JSON.stringify(links));

    } else if (req.method === 'POST') {
      const { clientName, link } = await getBody(req);

      if (!clientName) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing clientName' }));
        return;
      }

      // 1. Check existing task
      const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task?archived=false&include_closed=true`, {
        headers: { 'Authorization': apiToken }
      });
      
      if (!listResponse.ok) {
         const errorText = await listResponse.text();
         console.error(`ClickUp API Error (LIST): ${listResponse.status} - ${errorText}`);
         throw new Error(`Failed to fetch list: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const existingTask = listData.tasks?.find((t: any) => t.name.toLowerCase() === clientName.toLowerCase());

      if (existingTask) {
        // 2. Update existing task custom field
        const customFieldId = '833454be-cd31-4eb6-9b9d-64496b2740d0';
        const updateFieldResponse = await fetch(`https://api.clickup.com/api/v2/task/${existingTask.id}/field/${customFieldId}`, {
          method: 'POST',
          headers: { 
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: link })
        });

        if (!updateFieldResponse.ok) {
          console.warn(`ClickUp API Error (UPDATE FIELD): ${updateFieldResponse.status}`);
        }

        const updateResponse = await fetch(`https://api.clickup.com/api/v2/task/${existingTask.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ description: link }) // Also keep it in description as fallback
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`ClickUp API Error (UPDATE): ${updateResponse.status} - ${errorText}`);
            throw new Error(`Failed to update task: ${updateResponse.status}`);
        }

      } else {
        // 3. Create new task
        const customFieldId = '833454be-cd31-4eb6-9b9d-64496b2740d0';
        const createResponse = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task`, {
          method: 'POST',
          headers: { 
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name: clientName, 
            description: link,
            status: 'to do',
            custom_fields: [
              {
                id: customFieldId,
                value: link
              }
            ]
          })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`ClickUp API Error (CREATE): ${createResponse.status} - ${errorText}`);
            // If status is invalid, try without status
            if (errorText.includes("status")) {
                 const retryResponse = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': apiToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        name: clientName, 
                        description: link
                    })
                });
                if (!retryResponse.ok) {
                    const retryError = await retryResponse.text();
                    throw new Error(`Failed to create task (retry): ${retryError}`);
                }
            } else {
                throw new Error(`Failed to create task: ${errorText}`);
            }
        }
      }

      res.end(JSON.stringify({ success: true }));

    } else {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
  } catch (error: any) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}
