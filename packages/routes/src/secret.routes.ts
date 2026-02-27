import { IEncryptionService } from "@repo/di";
import {
	type GlobalSecret,
	ISecretRepository,
	type RepoSecret,
	type SecretRepository,
} from "@repo/repository";
import type { EncryptionService } from "@repo/service";
import type { ResponseType } from "@repo/types";
import { z } from "zod";
import { handleRoute, protectedProcedure, resolve } from "./procedure";

const listRepo = protectedProcedure
	.input(
		z.object({
			repoOwner: z.string().min(1),
			repoName: z.string().min(1),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<RepoSecret[]>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const secrets = await secretRepo.getRepoSecrets(
				input.repoOwner,
				input.repoName,
			);
			return { success: true, data: secrets };
		}, "Failed to list repo secrets");
	});

const createRepo = protectedProcedure
	.input(
		z.object({
			repoOwner: z.string().min(1),
			repoName: z.string().min(1),
			key: z.string().min(1),
			value: z.string().min(1),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<RepoSecret>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const encryptionService = resolve<EncryptionService>(IEncryptionService);

			const encryptedValue = encryptionService.encrypt(input.value);

			const secret = await secretRepo.createRepoSecret({
				repoOwner: input.repoOwner,
				repoName: input.repoName,
				key: input.key,
				encryptedValue,
				createdBy: context.user.id,
			});

			return { success: true, data: secret };
		}, "Failed to create repo secret");
	});

const deleteRepo = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const deleted = await secretRepo.deleteRepoSecret(input.id);
			if (!deleted) {
				return { success: false, error: "Secret not found" };
			}
			return { success: true, data: true };
		}, "Failed to delete repo secret");
	});

const listGlobal = protectedProcedure
	.input(
		z
			.object({
				organizationId: z.string().uuid().optional(),
			})
			.optional(),
	)
	.handler(async ({ input }): Promise<ResponseType<GlobalSecret[]>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const secrets = await secretRepo.getGlobalSecrets(input?.organizationId);
			return { success: true, data: secrets };
		}, "Failed to list global secrets");
	});

const createGlobal = protectedProcedure
	.input(
		z.object({
			key: z.string().min(1),
			value: z.string().min(1),
			organizationId: z.string().uuid().optional(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<GlobalSecret>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const encryptionService = resolve<EncryptionService>(IEncryptionService);

			const encryptedValue = encryptionService.encrypt(input.value);

			const secret = await secretRepo.createGlobalSecret({
				key: input.key,
				encryptedValue,
				organizationId: input.organizationId,
				createdBy: context.user.id,
			});

			return { success: true, data: secret };
		}, "Failed to create global secret");
	});

const deleteGlobal = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			const secretRepo = resolve<SecretRepository>(ISecretRepository);
			const deleted = await secretRepo.deleteGlobalSecret(input.id);
			if (!deleted) {
				return { success: false, error: "Secret not found" };
			}
			return { success: true, data: true };
		}, "Failed to delete global secret");
	});

export const secretRouter = {
	listRepo,
	createRepo,
	deleteRepo,
	listGlobal,
	createGlobal,
	deleteGlobal,
};
