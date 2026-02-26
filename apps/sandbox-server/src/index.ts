import { ProcessManager } from './process/manager';
import type { AcpClient } from './acp/client';
import { verifyAuth } from './auth';
import { handleInit } from './routes/init';
import { handlePrompt } from './routes/prompt';
import { handleExec } from './routes/exec';
import { handleCancel } from './routes/cancel';
import { handleHealth } from './routes/health';
import { handleTerminate } from './routes/terminate';

const PORT = Number(process.env.PORT) || 8080;

const processManager = new ProcessManager();
let acpClient: AcpClient | null = null;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // Health check doesn't require auth
    if (url.pathname === '/health' && method === 'GET') {
      return handleHealth(processManager);
    }

    // Init sets up auth, so it doesn't require a bearer token
    if (url.pathname === '/init' && method === 'POST') {
      return handleInit(req, processManager, (client) => {
        acpClient = client;
      });
    }

    // All other routes require auth
    if (!verifyAuth(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (url.pathname === '/prompt' && method === 'POST') {
      return handlePrompt(req, processManager, acpClient);
    }

    if (url.pathname === '/exec' && method === 'POST') {
      return handleExec(req);
    }

    if (url.pathname === '/cancel' && method === 'POST') {
      return handleCancel(acpClient);
    }

    if (url.pathname === '/terminate' && method === 'POST') {
      return handleTerminate(processManager);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`Sandbox server listening on port ${server.port}`);
