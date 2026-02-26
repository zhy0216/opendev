import { ProcessManager } from '../process/manager';
import { AcpClient } from '../acp/client';
import { setToken } from '../auth';

export async function handleInit(
  req: Request,
  processManager: ProcessManager,
  setAcpClient: (client: AcpClient) => void,
): Promise<Response> {
  if (processManager.getState() !== 'idle') {
    return Response.json({ error: 'Already initialized' }, { status: 409 });
  }

  const body = (await req.json()) as {
    apiKey: string;
    bearerToken: string;
    model?: string;
    systemPrompt?: string;
  };

  if (!body.apiKey || !body.bearerToken) {
    return Response.json({ error: 'apiKey and bearerToken are required' }, { status: 400 });
  }

  setToken(body.bearerToken);

  try {
    await processManager.spawn({
      command: 'claude-agent-acp',
      args: [],
      apiKey: body.apiKey,
      env: body.model ? { CLAUDE_MODEL: body.model } : undefined,
    });

    const proc = processManager.getProcess();
    if (!proc) {
      throw new Error('Process not available after spawn');
    }

    const acpClient = new AcpClient(proc);
    const result = await acpClient.initialize();
    processManager.setReady();
    setAcpClient(acpClient);

    return Response.json({
      sessionId: result.sessionId,
      capabilities: result.capabilities,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
