import 'reflect-metadata';
import { AsyncLocalStorage } from 'async_hooks';
import { Container } from 'inversify';
import type { DbClient } from '@repo/db';
import { ITransaction } from './types';
import { container } from './container';

// ServiceIdentifier type compatible with abstract class tokens and symbols
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceIdentifier = (abstract new (...args: any[]) => any) | symbol;

const requestContainerStorage = new AsyncLocalStorage<Container>();

/**
 * Gets the current request-scoped container or falls back to global container
 */
export function getContainer(): Container {
  return requestContainerStorage.getStore() ?? container;
}

/**
 * Gets a dependency from the current container using abstract class token
 */
export function getInject<T>(token: ServiceIdentifier): T {
  return getContainer().get<T>(token);
}

/**
 * Creates a child container with the transaction bound and runs the callback within it
 */
export async function runWithTransaction<T>(
  transaction: DbClient,
  callback: () => Promise<T>
): Promise<T> {
  const childContainer = new Container({ parent: container });
  childContainer.bind<DbClient>(ITransaction).toConstantValue(transaction);
  return requestContainerStorage.run(childContainer, callback);
}
