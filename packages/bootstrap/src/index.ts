import "reflect-metadata";
import { createAuth, IAuth } from "@repo/auth";
import { createDb } from "@repo/db";
import {
	getContainer,
	IDatabase,
	IEncryptionService,
	IExecuteTaskUseCase,
	IModalClient,
} from "@repo/di";
import { env } from "@repo/env";
import { configureLogger, logger } from "@repo/logger";
import {
	IIntegrationSettingRepository,
	IModelPreferenceRepository,
	IntegrationSettingRepository,
	IOrganizationRepository,
	IProjectRepository,
	IRepoImageRepository,
	ISandboxRepository,
	ISecretRepository,
	ISessionArtifactRepository,
	ISessionEventRepository,
	ISessionMessageRepository,
	ISessionParticipantRepository,
	ISessionRepository,
	IUserRepository,
	ModelPreferenceRepository,
	OrganizationRepository,
	ProjectRepository,
	RepoImageRepository,
	SandboxRepository,
	SecretRepository,
	SessionArtifactRepository,
	SessionEventRepository,
	SessionMessageRepository,
	SessionParticipantRepository,
	SessionRepository,
	UserRepository,
} from "@repo/repository";
import {
	EmailService,
	EncryptionService,
	GitHubBotService,
	GitHubService,
	IEmailService,
	IGitHubBotService,
	IGitHubService,
	IInternalAuthService,
	ILinearService,
	InternalAuthService,
	ISandboxBridge,
	ISandboxLifecycleManager,
	ISandboxManager,
	ISlackService,
	LinearService,
	ModalClient,
	SandboxBridge,
	SandboxLifecycleManager,
	SandboxManager,
	SlackService,
} from "@repo/service";
import {
	CreateProjectUseCase,
	CreateSessionUseCase,
	ExecuteTaskUseCase,
	ICreateProjectUseCase,
	ICreateSessionUseCase,
	IQueuePromptUseCase,
	QueuePromptUseCase,
} from "@repo/use-case";

// Each entry maps an abstract class token to its concrete implementation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bindings: [
	abstract new (...args: any[]) => any,
	new (...args: any[]) => any,
][] = [
	// Repositories
	[IUserRepository, UserRepository],
	[IProjectRepository, ProjectRepository],
	[IOrganizationRepository, OrganizationRepository],
	[ISessionRepository, SessionRepository],
	[ISessionParticipantRepository, SessionParticipantRepository],
	[ISessionMessageRepository, SessionMessageRepository],
	[ISessionEventRepository, SessionEventRepository],
	[ISessionArtifactRepository, SessionArtifactRepository],
	[ISecretRepository, SecretRepository],
	[IModelPreferenceRepository, ModelPreferenceRepository],
	[IIntegrationSettingRepository, IntegrationSettingRepository],
	[ISandboxRepository, SandboxRepository],
	[IRepoImageRepository, RepoImageRepository],
	// Services
	[IEmailService, EmailService],
	[IEncryptionService, EncryptionService],
	[IGitHubService, GitHubService],
	[IInternalAuthService, InternalAuthService],
	[ISandboxManager, SandboxManager],
	[ISandboxLifecycleManager, SandboxLifecycleManager],
	[ISandboxBridge, SandboxBridge],
	[ISlackService, SlackService],
	[IGitHubBotService, GitHubBotService],
	[ILinearService, LinearService],
	[IModalClient, ModalClient],
	// Use cases
	[ICreateProjectUseCase, CreateProjectUseCase],
	[ICreateSessionUseCase, CreateSessionUseCase],
	[IQueuePromptUseCase, QueuePromptUseCase],
	[IExecuteTaskUseCase, ExecuteTaskUseCase],
];

export function initializeContainer() {
	configureLogger({
		context: {
			env: env.NODE_ENV,
			service: "api-server",
		},
	});

	logger
		.withMetadata({
			nodeEnv: env.NODE_ENV,
			logLevel: env.LOG_LEVEL || "auto",
		})
		.info("Initializing application container");

	const container = getContainer();

	// Bind database
	const db = createDb(env.DATABASE_URL);
	container.bind(IDatabase).toConstantValue(db);

	// Bind auth
	container.bind(IAuth).toConstantValue(createAuth(db));

	// Bind all repositories, services, and use cases
	for (const [token, implementation] of bindings) {
		container.bind(token).to(implementation);
	}

	logger.debug("Container initialization complete");

	return container;
}
