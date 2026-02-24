import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SandboxEvent } from '@repo/types';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('SandboxBridge');

export abstract class ISandboxBridge {
  abstract emitEvent(event: SandboxEvent): void;
  abstract onEvent(sessionId: string, callback: (event: SandboxEvent) => void): void;
  abstract removeListener(sessionId: string): void;
}

@injectable()
export class SandboxBridge extends ISandboxBridge {
  private listeners = new Map<string, (event: SandboxEvent) => void>();

  emitEvent(event: SandboxEvent): void {
    const listener = this.listeners.get(event.sessionId);
    if (listener) {
      listener(event);
      log.debug('Event emitted to listener', { sessionId: event.sessionId, type: event.type });
    } else {
      log.debug('No listener for session', { sessionId: event.sessionId, type: event.type });
    }
  }

  onEvent(sessionId: string, callback: (event: SandboxEvent) => void): void {
    this.listeners.set(sessionId, callback);
    log.debug('Listener registered', { sessionId });
  }

  removeListener(sessionId: string): void {
    this.listeners.delete(sessionId);
    log.debug('Listener removed', { sessionId });
  }
}
