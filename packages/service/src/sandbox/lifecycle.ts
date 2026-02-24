import 'reflect-metadata';
import { injectable } from 'inversify';
import { getInject } from '@repo/di';
import { ISandboxRepository, type SandboxRepository } from '@repo/repository';
import type { SpawnDecision } from '@repo/types';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('SandboxLifecycleManager');

const MAX_SPAWN_FAILURES = 3;
const SPAWN_FAILURE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export abstract class ISandboxLifecycleManager {
  abstract shouldSpawn(state: { status: string; spawnFailureCount: number; lastSpawnFailure: Date | null }): SpawnDecision;
  abstract shouldTimeout(state: { lastActivity: Date | null; status: string }): boolean;
  abstract handleHeartbeat(sandboxId: string): Promise<void>;
}

@injectable()
export class SandboxLifecycleManager extends ISandboxLifecycleManager {
  shouldSpawn(state: { status: string; spawnFailureCount: number; lastSpawnFailure: Date | null }): SpawnDecision {
    // Don't spawn if already running or starting
    if (state.status === 'running' || state.status === 'starting') {
      return { shouldSpawn: false, reason: `Sandbox is already ${state.status}` };
    }

    // Circuit breaker: check if we've exceeded max failures within the window
    if (state.spawnFailureCount >= MAX_SPAWN_FAILURES && state.lastSpawnFailure) {
      const timeSinceLastFailure = Date.now() - state.lastSpawnFailure.getTime();
      if (timeSinceLastFailure < SPAWN_FAILURE_WINDOW_MS) {
        return {
          shouldSpawn: false,
          reason: `Circuit breaker open: ${state.spawnFailureCount} failures in the last 5 minutes`,
        };
      }
    }

    return { shouldSpawn: true, reason: 'Sandbox is eligible for spawning' };
  }

  shouldTimeout(state: { lastActivity: Date | null; status: string }): boolean {
    // Only timeout running sandboxes
    if (state.status !== 'running') {
      return false;
    }

    // If no activity recorded, don't timeout
    if (!state.lastActivity) {
      return false;
    }

    const timeSinceActivity = Date.now() - state.lastActivity.getTime();
    return timeSinceActivity > TIMEOUT_MS;
  }

  async handleHeartbeat(sandboxId: string): Promise<void> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    await sandboxRepo.updateHeartbeat(sandboxId);
    log.debug('Heartbeat recorded', { sandboxId });
  }
}
