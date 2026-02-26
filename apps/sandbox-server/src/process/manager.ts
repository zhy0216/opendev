import { spawn, type ChildProcess } from 'node:child_process';

export type ProcessState = 'idle' | 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';

export interface SpawnConfig {
  command: string;
  args: string[];
  apiKey: string;
  env?: Record<string, string>;
}

export class ProcessManager {
  private state: ProcessState = 'idle';
  private process: ChildProcess | null = null;
  private apiKey: string | null = null;

  getState(): ProcessState {
    return this.state;
  }

  getProcess(): ChildProcess | null {
    return this.process;
  }

  async spawn(config: SpawnConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot spawn in state: ${this.state}`);
    }

    this.state = 'initializing';
    this.apiKey = config.apiKey;

    const proc = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: config.apiKey,
        ...config.env,
      },
    });

    proc.on('exit', (code) => {
      if (this.state !== 'terminated') {
        this.state = 'error';
        console.error(`Process exited unexpectedly with code ${code}`);
      }
    });

    this.process = proc;

    await new Promise<void>((resolve) => {
      if (proc.exitCode !== null) {
        this.state = 'ready';
        resolve();
      } else {
        setTimeout(() => {
          if (this.state === 'initializing') {
            this.state = 'ready';
          }
          resolve();
        }, 100);
      }
    });
  }

  setReady(): void {
    this.state = 'ready';
  }

  setBusy(): void {
    this.state = 'busy';
  }

  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.apiKey = null;
    this.state = 'terminated';
  }
}
