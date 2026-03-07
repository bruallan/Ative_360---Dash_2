import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.resolve(__dirname, '../data/client_links.json');

export default async function clientLinksHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  // Ensure data directory exists
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure file exists
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}', 'utf-8');
  }

  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.end(data);
    } catch (error) {
      console.error('Error reading client links:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { clientName, link } = JSON.parse(body);
        
        if (!clientName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing clientName' }));
          return;
        }

        const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8') || '{}');
        currentData[clientName] = link;

        fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
        
        res.end(JSON.stringify({ success: true, links: currentData }));
      } catch (error) {
        console.error('Error saving client link:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }
}
