import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer, IEncryptionService } from '@repo/di';
import {
  ISecretRepository,
  type SecretRepository,
  type RepoSecret,
  type GlobalSecret,
} from '@repo/repository';
import type { EncryptionService } from '@repo/service';
import type { ResponseType } from '@repo/types';

const listRepo = protectedProcedure
  .input(
    z.object({
      repoOwner: z.string().min(1),
      repoName: z.string().min(1),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<RepoSecret[]>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const secrets = await secretRepo.getRepoSecrets(input.repoOwner, input.repoName);
      return { success: true, data: secrets };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list repo secrets' };
    }
  });

const createRepo = protectedProcedure
  .input(
    z.object({
      repoOwner: z.string().min(1),
      repoName: z.string().min(1),
      key: z.string().min(1),
      value: z.string().min(1),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<RepoSecret>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const encryptionService = getContainer().get<EncryptionService>(IEncryptionService);

      const encryptedValue = encryptionService.encrypt(input.value);

      const secret = await secretRepo.createRepoSecret({
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        key: input.key,
        encryptedValue,
        createdBy: context.user.id,
      });

      return { success: true, data: secret };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create repo secret' };
    }
  });

const deleteRepo = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<boolean>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const deleted = await secretRepo.deleteRepoSecret(input.id);
      if (!deleted) {
        return { success: false, error: 'Secret not found' };
      }
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete repo secret' };
    }
  });

const listGlobal = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ input }): Promise<ResponseType<GlobalSecret[]>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const secrets = await secretRepo.getGlobalSecrets(input?.organizationId);
      return { success: true, data: secrets };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list global secrets' };
    }
  });

const createGlobal = protectedProcedure
  .input(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
      organizationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<GlobalSecret>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const encryptionService = getContainer().get<EncryptionService>(IEncryptionService);

      const encryptedValue = encryptionService.encrypt(input.value);

      const secret = await secretRepo.createGlobalSecret({
        key: input.key,
        encryptedValue,
        organizationId: input.organizationId,
        createdBy: context.user.id,
      });

      return { success: true, data: secret };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create global secret' };
    }
  });

const deleteGlobal = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<boolean>> => {
    try {
      const secretRepo = getContainer().get<SecretRepository>(ISecretRepository);
      const deleted = await secretRepo.deleteGlobalSecret(input.id);
      if (!deleted) {
        return { success: false, error: 'Secret not found' };
      }
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete global secret' };
    }
  });

export const secretRouter = {
  listRepo,
  createRepo,
  deleteRepo,
  listGlobal,
  createGlobal,
  deleteGlobal,
};
