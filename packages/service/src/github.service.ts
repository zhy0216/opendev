import 'reflect-metadata';
import { injectable } from 'inversify';
import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('GitHubService');

export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface CreatePRParams {
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface GitHubPR {
  id: number;
  number: number;
  url: string;
  htmlUrl: string;
}

export abstract class IGitHubService {
  abstract getInstallationToken(installationId: number): Promise<string>;
  abstract listInstalledRepos(installationId: number): Promise<GitHubRepo[]>;
  abstract listUserRepos(accessToken: string): Promise<GitHubRepo[]>;
  abstract getRepo(owner: string, name: string, installationId: number): Promise<GitHubRepo>;
  abstract cloneUrl(owner: string, name: string, token: string): string;
  abstract createBranch(
    owner: string,
    name: string,
    baseSha: string,
    branchName: string,
    installationId: number,
  ): Promise<void>;
  abstract createPullRequest(
    owner: string,
    name: string,
    params: CreatePRParams,
    installationId: number,
  ): Promise<GitHubPR>;
}

@injectable()
export class GitHubService extends IGitHubService {
  private readonly configured: boolean;

  constructor() {
    super();
    this.configured = !!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
    if (!this.configured) {
      log.warn('GitHub App credentials not configured. GitHub integration will be unavailable.');
    }
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new Error('GitHub not configured');
    }
  }

  private getInstallationOctokit(installationId: number): Octokit {
    this.ensureConfigured();
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID!,
        privateKey: env.GITHUB_APP_PRIVATE_KEY!,
        installationId,
      },
    });
  }

  async getInstallationToken(installationId: number): Promise<string> {
    this.ensureConfigured();

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID!,
        privateKey: env.GITHUB_APP_PRIVATE_KEY!,
        installationId,
      },
    });

    const auth = await octokit.auth({
      type: 'installation',
      installationId,
    }) as { token: string };

    log.debug('Generated installation token', { installationId });
    return auth.token;
  }

  async listInstalledRepos(installationId: number): Promise<GitHubRepo[]> {
    const octokit = this.getInstallationOctokit(installationId);

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    log.debug('Listed installed repos', { installationId, count: data.repositories.length });

    return data.repositories.map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
    }));
  }

  async listUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    const octokit = new Octokit({ auth: accessToken });

    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
      affiliation: 'owner,collaborator,organization_member',
    });

    log.debug('Listed user repos', { count: repos.length });

    return repos.map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
    }));
  }

  async getRepo(owner: string, name: string, installationId: number): Promise<GitHubRepo> {
    const octokit = this.getInstallationOctokit(installationId);

    const { data: repo } = await octokit.rest.repos.get({
      owner,
      repo: name,
    });

    log.debug('Retrieved repo', { owner, name, installationId });

    return {
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
    };
  }

  cloneUrl(owner: string, name: string, token: string): string {
    return `https://x-access-token:${token}@github.com/${owner}/${name}.git`;
  }

  async createBranch(
    owner: string,
    name: string,
    baseSha: string,
    branchName: string,
    installationId: number,
  ): Promise<void> {
    const octokit = this.getInstallationOctokit(installationId);

    await octokit.rest.git.createRef({
      owner,
      repo: name,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    log.info('Created branch', { owner, repo: name, branchName, baseSha });
  }

  async createPullRequest(
    owner: string,
    name: string,
    params: CreatePRParams,
    installationId: number,
  ): Promise<GitHubPR> {
    const octokit = this.getInstallationOctokit(installationId);

    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo: name,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    });

    log.info('Created pull request', { owner, repo: name, prNumber: pr.number });

    return {
      id: pr.id,
      number: pr.number,
      url: pr.url,
      htmlUrl: pr.html_url,
    };
  }
}
