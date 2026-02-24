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
