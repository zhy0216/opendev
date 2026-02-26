import type { DbClient } from '@repo/db';

// Database
export abstract class IDatabase {
  abstract readonly client: DbClient;
}

export abstract class ITransaction {
  abstract readonly client: DbClient;
}

// Services
export abstract class IEncryptionService {
  abstract encrypt(plaintext: string): string;
  abstract decrypt(ciphertext: string): string;
  abstract hashToken(token: string): string;
  abstract generateToken(): string;
}

export abstract class IInternalAuthService {
  abstract generateToken(): string;
  abstract verifyToken(token: string): boolean;
  abstract generateSandboxToken(): { token: string; hash: string };
  abstract verifySandboxToken(rawToken: string, storedHash: string): boolean;
}

// Blueprint
export abstract class IExecuteTaskUseCase {
  abstract execute(input: {
    sessionId: string;
    messageId: string;
    prompt: string;
    repoOwner?: string;
    repoName?: string;
    branchName?: string;
  }): Promise<void>;
}

// Modal Sandbox
export abstract class IModalClient {
  abstract createSandbox(config: {
    image: string;
    encryptedPorts: number[];
    idleTimeout?: number;
  }): Promise<{ sandboxId: string; tunnelUrl: string }>;
  abstract terminateSandbox(sandboxId: string): Promise<void>;
}
