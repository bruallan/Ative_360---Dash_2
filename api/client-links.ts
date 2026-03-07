import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

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
  // We need the list ID. Ideally from env, but we can fallback to a hardcoded one or fail gracefully.
  // The frontend should have provided this via constants, but here we are in backend.
  // We will try to read from env var CLICKUP_CONFIG_LIST_ID.
  const configListId = process.env.CLICKUP_CONFIG_LIST_ID;

  if (!apiToken) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'CLICKUP_API_TOKEN not configured' }));
    return;
  }

  if (!configListId) {
    // If no config list is set, we can't save.
    // We return empty object for GET, and error for POST.
    if (req.method === 'GET') {
      res.end(JSON.stringify({}));
      return;
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: 'CLICKUP_CONFIG_LIST_ID not configured. Please create a list in ClickUp for dashboard links and add its ID to .env' 
      }));
      return;
    }
  }

  try {
    if (req.method === 'GET') {
      // 1. Fetch all tasks from the config list
      const response = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task?archived=false`, {
        headers: { 'Authorization': apiToken }
      });

      if (!response.ok) {
        throw new Error(`ClickUp API Error: ${response.status}`);
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      // 2. Map tasks to { clientName: link }
      // We assume Task Name = Client Name, Description = Link
      const links: Record<string, string> = {};
      tasks.forEach((task: any) => {
        if (task.description) {
          links[task.name] = task.description; // Description contains the link
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

      // 1. Check if task for this client already exists
      // We fetch tasks filtering by name is hard in ClickUp V2 without custom search, 
      // so we fetch all (usually config list is small) and find in memory.
      const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task?archived=false`, {
        headers: { 'Authorization': apiToken }
      });
      
      const listData = await listResponse.json();
      const existingTask = listData.tasks?.find((t: any) => t.name.toLowerCase() === clientName.toLowerCase());

      if (existingTask) {
        // 2. Update existing task
        const updateResponse = await fetch(`https://api.clickup.com/api/v2/task/${existingTask.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ description: link })
        });

        if (!updateResponse.ok) throw new Error('Failed to update task');

      } else {
        // 3. Create new task
        const createResponse = await fetch(`https://api.clickup.com/api/v2/list/${configListId}/task`, {
          method: 'POST',
          headers: { 
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name: clientName, 
            description: link,
            status: 'OPEN' // Default status
          })
        });

        if (!createResponse.ok) throw new Error('Failed to create task');
      }

      // Return updated links (re-fetch or just return success)
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
