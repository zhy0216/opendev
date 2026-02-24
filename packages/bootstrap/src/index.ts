import 'reflect-metadata';
import { getContainer, IDatabase, IEncryptionService } from '@repo/di';
import { createAuth, IAuth } from '@repo/auth';
import {
  UserRepository,
  IUserRepository,
  ProjectRepository,
  IProjectRepository,
  OrganizationRepository,
  IOrganizationRepository,
  SessionRepository,
  ISessionRepository,
  SessionParticipantRepository,
  ISessionParticipantRepository,
  SessionMessageRepository,
  ISessionMessageRepository,
  SessionEventRepository,
  ISessionEventRepository,
  SessionArtifactRepository,
  ISessionArtifactRepository,
  SecretRepository,
  ISecretRepository,
  ModelPreferenceRepository,
  IModelPreferenceRepository,
  IntegrationSettingRepository,
  IIntegrationSettingRepository,
  SandboxRepository,
  ISandboxRepository,
} from '@repo/repository';
import {
  EmailService,
  IEmailService,
  EncryptionService,
  GitHubService,
  IGitHubService,
  InternalAuthService,
  IInternalAuthService,
  SandboxManager,
  ISandboxManager,
  SandboxLifecycleManager,
  ISandboxLifecycleManager,
  SandboxBridge,
  ISandboxBridge,
} from '@repo/service';
import {
  CreateProjectUseCase,
  ICreateProjectUseCase,
  CreateSessionUseCase,
  ICreateSessionUseCase,
  QueuePromptUseCase,
  IQueuePromptUseCase,
} from '@repo/use-case';
import { createDb } from '@repo/db';
import { env } from '@repo/env';
import { configureLogger, logger } from '@repo/logger';

export function initializeContainer() {
  // Configure logger with environment context
  configureLogger({
    context: {
      env: env.NODE_ENV,
      service: 'api-server',
    },
  });

  logger
    .withMetadata({
      nodeEnv: env.NODE_ENV,
      logLevel: env.LOG_LEVEL || 'auto',
    })
    .info('Initializing application container');

  const container = getContainer();

  // Bind database
  const db = createDb(env.DATABASE_URL);
  container.bind(IDatabase).toConstantValue(db as any);

  // Bind auth
  container.bind(IAuth).toConstantValue(createAuth(db));

  // Bind repositories
  container.bind(IUserRepository).to(UserRepository);
  container.bind(IProjectRepository).to(ProjectRepository);
  container.bind(IOrganizationRepository).to(OrganizationRepository);
  container.bind(ISessionRepository).to(SessionRepository);
  container.bind(ISessionParticipantRepository).to(SessionParticipantRepository);
  container.bind(ISessionMessageRepository).to(SessionMessageRepository);
  container.bind(ISessionEventRepository).to(SessionEventRepository);
  container.bind(ISessionArtifactRepository).to(SessionArtifactRepository);
  container.bind(ISecretRepository).to(SecretRepository);
  container.bind(IModelPreferenceRepository).to(ModelPreferenceRepository);
  container.bind(IIntegrationSettingRepository).to(IntegrationSettingRepository);
  container.bind(ISandboxRepository).to(SandboxRepository);

  // Bind services
  container.bind(IEmailService).to(EmailService);
  container.bind(IEncryptionService).to(EncryptionService);
  container.bind(IGitHubService).to(GitHubService);
  container.bind(IInternalAuthService).to(InternalAuthService);
  container.bind(ISandboxManager).to(SandboxManager);
  container.bind(ISandboxLifecycleManager).to(SandboxLifecycleManager);
  container.bind(ISandboxBridge).to(SandboxBridge);

  // Bind use cases
  container.bind(ICreateProjectUseCase).to(CreateProjectUseCase);
  container.bind(ICreateSessionUseCase).to(CreateSessionUseCase);
  container.bind(IQueuePromptUseCase).to(QueuePromptUseCase);

  logger.debug('Container initialization complete');

  return container;
}
