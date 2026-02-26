import 'reflect-metadata';
import { injectable } from 'inversify';
import { IModalClient } from '@repo/di';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('ModalClient');

@injectable()
export class ModalClient extends IModalClient {
  async createSandbox(config: {
    image: string;
    encryptedPorts: number[];
    idleTimeout?: number;
  }): Promise<{ sandboxId: string; tunnelUrl: string }> {
    log.info('Creating Modal sandbox', { image: config.image });

    // Dynamic import to avoid loading modal SDK when not configured
    const modal = await import('modal');

    const sandbox = await (modal as any).Sandbox.create({
      image: config.image,
      encrypted_ports: config.encryptedPorts,
      idle_timeout: config.idleTimeout ?? 1800,
    });

    const sandboxId = sandbox.object_id;

    // Wait for tunnel to be ready
    const tunnels = await sandbox.tunnels({ timeout: 15 });
    const tunnel = tunnels[8080];
    if (!tunnel) {
      await sandbox.terminate();
      throw new Error('Tunnel on port 8080 not available');
    }

    const tunnelUrl = tunnel.url;

    log.info('Modal sandbox created', { sandboxId, tunnelUrl });
    return { sandboxId, tunnelUrl };
  }

  async terminateSandbox(sandboxId: string): Promise<void> {
    log.info('Terminating Modal sandbox', { sandboxId });

    const modal = await import('modal');
    const sandbox = await (modal as any).Sandbox.from_id(sandboxId);
    await sandbox.terminate();

    log.info('Modal sandbox terminated', { sandboxId });
  }
}
