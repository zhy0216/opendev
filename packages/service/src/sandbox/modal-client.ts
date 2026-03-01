import 'reflect-metadata';
import { injectable } from 'inversify';
import { IModalClient } from '@repo/di';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('ModalClient');

@injectable()
export class ModalClient extends IModalClient {
  private client: import('modal').ModalClient | null = null;

  private getClient(): import('modal').ModalClient {
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ModalClient: MC } = require('modal') as typeof import('modal');
      this.client = new MC();
    }
    return this.client;
  }

  async createSandbox(config: {
    image: string;
    encryptedPorts: number[];
    idleTimeout?: number;
  }): Promise<{ sandboxId: string; tunnelUrl: string }> {
    log.info('Creating Modal sandbox', { image: config.image });

    const modal = this.getClient();

    const app = await modal.apps.fromName(env.MODAL_APP_NAME, { createIfMissing: true });
    const image = modal.images.fromRegistry(config.image);

    const sandbox = await modal.sandboxes.create(app, image, {
      encryptedPorts: config.encryptedPorts,
      timeout: 3 * 60 * 60 * 1000, // 3 hours max lifetime
      idleTimeoutMs: (config.idleTimeout ?? 1800) * 1000,
    });

    const sandboxId = sandbox.sandboxId;

    // Wait for tunnel to be ready (15s timeout)
    const tunnels = await sandbox.tunnels(15_000);
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

    const modal = this.getClient();
    const sandbox = await modal.sandboxes.fromId(sandboxId);
    await sandbox.terminate();

    log.info('Modal sandbox terminated', { sandboxId });
  }
}
