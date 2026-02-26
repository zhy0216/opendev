import type { AcpClient } from '../acp/client';
import type { ProcessManager } from '../process/manager';

export async function handlePrompt(
  req: Request,
  processManager: ProcessManager,
  acpClient: AcpClient | null,
): Promise<Response> {
  const state = processManager.getState();
  if (state !== 'ready') {
    return Response.json({ error: `Cannot prompt in state: ${state}` }, { status: 409 });
  }

  if (!acpClient) {
    return Response.json({ error: 'ACP client not initialized' }, { status: 500 });
  }

  const body = (await req.json()) as { prompt: string };
  if (!body.prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 });
  }

  processManager.setBusy();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await acpClient.sendPrompt(body.prompt, (sseEvent) => {
          sendEvent(sseEvent.type, sseEvent.data);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent('error', { message });
      } finally {
        processManager.setReady();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
