import type { AcpClient } from '../acp/client';

export async function handleCancel(acpClient: AcpClient | null): Promise<Response> {
  if (acpClient) {
    await acpClient.cancel();
  }
  return Response.json({ cancelled: true });
}
