import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
// @ts-ignore
import membersHandler from './api/members';
// @ts-ignore
import tasksHandler from './api/tasks';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Ensure process.env is populated for the handler
  process.env.CLICKUP_API_TOKEN = env.CLICKUP_API_TOKEN;

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api/members', (req, res, next) => {
            // @ts-ignore
            membersHandler(req, res).catch(next);
          });
          server.middlewares.use('/api/tasks', (req, res, next) => {
            // @ts-ignore
            tasksHandler(req, res).catch(next);
          });
        },
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
