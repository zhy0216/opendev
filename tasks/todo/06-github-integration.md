# 06 - GitHub Integration

## Summary

Integrate with GitHub for repository access: list installed repos, clone repos into sandboxes, push commits, and create pull requests. This requires a GitHub App installation.

## Reference

`scaffold/background-agents/packages/control-plane/src/github/` (GitHub client)
`scaffold/background-agents/packages/control-plane/src/router.ts` (repo routes)

## Components

### GitHub App Setup
- Create a GitHub App with permissions: repo contents (read/write), pull requests (read/write), issues (read)
- Store: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Add env vars to `packages/env/src/env.ts`

### GitHub Service (`packages/service/src/github.service.ts`)

```typescript
class GitHubService {
  // App-level auth (installation token)
  getInstallationToken(installationId: number): Promise<string>;

  // Repository operations
  listInstalledRepos(): Promise<Repo[]>;
  getRepo(owner: string, name: string): Promise<Repo>;
  cloneUrl(owner: string, name: string, token: string): string;

  // Branch operations
  createBranch(owner: string, name: string, baseSha: string, branchName: string): Promise<void>;

  // Pull request operations
  createPullRequest(owner: string, name: string, params: CreatePRParams): Promise<PR>;

  // User-level operations (using user's OAuth token)
  createPullRequestAsUser(userToken: string, owner: string, name: string, params: CreatePRParams): Promise<PR>;
}
```

### API Routes

| Route | Description |
|-------|-------------|
| `repo.list` | List repos from all GitHub App installations |
| `repo.get` | Get single repo details |

### OAuth Flow (Optional Enhancement)
If using user-scoped GitHub tokens (for PR attribution):
- Add GitHub as an additional auth provider in Better Auth
- Store encrypted GitHub tokens per user
- Use user tokens for PR creation (PRs authored by user, not bot)

## Implementation Steps

1. Add GitHub env vars to `packages/env/src/env.ts`
2. Create `packages/service/src/github.service.ts` using Octokit
3. Add abstract interface to `packages/di/src/types.ts`
4. Register in `packages/bootstrap`
5. Create `repo.routes.ts` in `packages/routes/src/`
6. Wire into router

## Dependencies

- Task 01 (for repo_secret schema, optional)

## Acceptance Criteria

- Can list all repos where GitHub App is installed
- Can generate installation tokens for repo operations
- Can create PRs (as bot or as user)
- Tokens are encrypted at rest
- Rate limiting awareness (GitHub API limits)
