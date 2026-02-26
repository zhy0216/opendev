import { exec as execCb } from 'node:child_process';

const DEFAULT_TIMEOUT = 60_000;

export async function handleExec(req: Request): Promise<Response> {
  const body = (await req.json()) as { command: string; timeout?: number };
  if (!body.command) {
    return Response.json({ error: 'command is required' }, { status: 400 });
  }

  const timeout = body.timeout ?? DEFAULT_TIMEOUT;

  return new Promise<Response>((resolve) => {
    execCb(body.command, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      const exitCode = err ? ((err as NodeJS.ErrnoException & { code?: number }).code ?? 1) : 0;
      resolve(Response.json({ exitCode, stdout, stderr }));
    });
  });
}
