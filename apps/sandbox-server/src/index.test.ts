import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  // Start the server on a random test port
  const { ProcessManager } = await import('./process/manager');
  const { verifyAuth } = await import('./auth');
  const { handleHealth } = await import('./routes/health');
  const { handleExec } = await import('./routes/exec');
  const { handlePrompt } = await import('./routes/prompt');
  const { handleInit } = await import('./routes/init');
  const { handleCancel } = await import('./routes/cancel');
  const { handleTerminate } = await import('./routes/terminate');
  const { AcpClient } = await import('./acp/client');

  const processManager = new ProcessManager();
  let acpClient: InstanceType<typeof AcpClient> | null = null;

  server = Bun.serve({
    port: 0, // random port
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;

      if (url.pathname === '/health' && method === 'GET') {
        return handleHealth(processManager);
      }
      if (url.pathname === '/init' && method === 'POST') {
        return handleInit(req, processManager, (client) => { acpClient = client; });
      }
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
});

afterAll(() => {
  server?.stop();
});

function url(path: string): string {
  return `http://localhost:${server.port}${path}`;
}

describe('Sandbox Server Integration', () => {
  test('GET /health returns idle status', async () => {
    const res = await fetch(url('/health'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('idle');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('POST /prompt before init returns 409', async () => {
    const res = await fetch(url('/prompt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    expect(res.status).toBe(409);
  });

  test('POST /exec runs a command', async () => {
    const res = await fetch(url('/exec'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'echo hello' }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.exitCode).toBe(0);
    expect(body.stdout).toContain('hello');
  });

  test('POST /exec handles failing command', async () => {
    const res = await fetch(url('/exec'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'false' }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.exitCode).not.toBe(0);
  });

  test('GET /nonexistent returns 404', async () => {
    const res = await fetch(url('/nonexistent'));
    expect(res.status).toBe(404);
  });

  test('POST /exec requires command field', async () => {
    const res = await fetch(url('/exec'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
