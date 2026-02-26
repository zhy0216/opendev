import type { ProcessManager } from '../process/manager';

export function handleHealth(processManager: ProcessManager): Response {
  return Response.json({
    status: processManager.getState(),
    uptime: process.uptime(),
    lastActivity: Date.now(),
  });
}
