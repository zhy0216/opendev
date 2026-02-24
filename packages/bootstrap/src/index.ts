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
} from '@repo/repository';
import { EmailService, IEmailService, EncryptionService } from '@repo/service';
import { CreateProjectUseCase, ICreateProjectUseCase } from '@repo/use-case';
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

  // Bind services
  container.bind(IEmailService).to(EmailService);
  container.bind(IEncryptionService).to(EncryptionService);

  // Bind use cases
  container.bind(ICreateProjectUseCase).to(CreateProjectUseCase);

  logger.debug('Container initialization complete');

  return container;
}
