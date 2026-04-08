# Como Configurar a Sincronização Automática (Cron Job) no GitHub

Como o seu projeto tem milhares de tarefas e a sincronização leva até 8 minutos, é **tecnicamente impossível** rodar esse processo diretamente na Vercel (que tem um limite de 10 a 60 segundos e corta a conexão).

A solução profissional é usar o **GitHub Actions** como servidor de processamento em segundo plano.

Siga os passos abaixo para configurar:

## Passo 1: Criar o arquivo do Workflow no GitHub
Como o Google AI Studio bloqueia a criação de pastas `.github` por segurança, você precisa fazer isso manualmente no seu repositório:

1. Acesse o seu repositório no GitHub.
2. Clique em **Add file** > **Create new file**.
3. No nome do arquivo, digite exatamente: `.github/workflows/sync.yml`
4. Cole o código abaixo dentro do arquivo:

```yaml
name: ClickUp Sync Cron Job

on:
  schedule:
    # Roda a cada hora (ajuste conforme necessário)
    - cron: '0 * * * *'
  workflow_dispatch: # Permite rodar manualmente pelo painel do GitHub ou via API (Botão do Dashboard)

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout do código
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependências
        run: npm install

      - name: Rodar Sincronização
        env:
          CLICKUP_API_TOKEN: ${{ secrets.CLICKUP_API_TOKEN }}
          # Adicione outras variáveis de ambiente se o script precisar (ex: FIREBASE_PROJECT_ID)
        run: npm run sync:once
```
5. Clique em **Commit changes...** para salvar.

## Passo 2: Configurar os Segredos (Secrets) no GitHub
O GitHub Actions precisa do seu token do ClickUp para conseguir baixar as tarefas.

1. No seu repositório do GitHub, vá em **Settings** (Configurações).
2. No menu lateral esquerdo, vá em **Secrets and variables** > **Actions**.
3. Clique no botão verde **New repository secret**.
4. Crie um secret com o nome: `CLICKUP_API_TOKEN`
5. Cole o seu token do ClickUp no valor e salve.

## Passo 3: Fazer o Botão "Forçar Sincronização" funcionar na Vercel
Para que o botão do seu dashboard na Vercel consiga "avisar" o GitHub para rodar o script, você precisa configurar 3 variáveis de ambiente na Vercel:

1. Vá no painel do seu projeto na **Vercel**.
2. Vá em **Settings** > **Environment Variables**.
3. Adicione as seguintes variáveis:
   - `GITHUB_TOKEN`: Um Personal Access Token (PAT) do GitHub com permissão de `repo` ou `actions`. (Você cria isso nas configurações do seu perfil do GitHub > Developer Settings > Personal access tokens).
   - `GITHUB_OWNER`: O seu nome de usuário ou organização no GitHub (ex: `brunoallan`).
   - `GITHUB_REPO`: O nome do seu repositório (ex: `meu-dashboard-clickup`).

**Pronto!** Agora, quando você clicar no botão "Forçar Sincronização" na Vercel, ela vai enviar um comando rápido (que dura 1 segundo) para o GitHub. O GitHub vai iniciar o processo de 8 minutos, e a barra de progresso no seu dashboard vai se mover normalmente, pois ela lê o status direto do banco de dados!
