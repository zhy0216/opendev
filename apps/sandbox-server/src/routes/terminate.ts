import type { ProcessManager } from '../process/manager';
import { clearToken } from '../auth';

export function handleTerminate(processManager: ProcessManager): Response {
  processManager.kill();
  clearToken();
  return Response.json({ terminated: true });
}
