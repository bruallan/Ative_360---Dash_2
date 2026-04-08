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

export default async function syncHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubToken || !githubOwner || !githubRepo) {
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: 'Configuração do GitHub ausente.',
      details: 'Para rodar a sincronização na Vercel, configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO nas variáveis de ambiente.'
    }));
    return;
  }

  try {
    // Dispara o workflow do GitHub Actions (sync.yml)
    const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/sync.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main' // ou a branch principal do seu repositório (ex: 'master')
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao disparar GitHub Actions: ${response.status} - ${errorText}`);
      throw new Error(`Falha ao iniciar sincronização no GitHub: ${response.status}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ 
      status: "Sync triggered", 
      message: "Sincronização iniciada com sucesso no GitHub Actions!" 
    }));

  } catch (error: any) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}

