# 17 - Link Projects to Organizations

## Summary

The current schema has projects and organizations as separate entities. For the agent system to work properly (org-scoped sessions, secrets, model preferences), projects need to belong to organizations.

## Current State

- `project` table has no `organizationId` column
- Projects and organizations are completely independent

## Changes Required

### Schema
- Add `organization_id` (uuid FK → organization, nullable) to `project` table
- Add index on `organization_id`

### Repository
- Update `ProjectRepository.findByUserId` to optionally filter by org
- Add `ProjectRepository.findByOrganization(orgId)`

### Routes
- Update `project.list` to accept optional `organizationId` filter
- Update `project.create` to accept optional `organizationId`
- Verify org membership when creating project under an org

### Frontend
- Update project list to show org context
- Project creation modal: optional org selector
- Organization detail page: show org's projects

## Implementation Steps

1. Add migration for `organization_id` column on `project`
2. Update `project.schema.ts`
3. Update `ProjectRepository`
4. Update `project.routes.ts`
5. Update frontend project components

## Dependencies

None (existing schemas).

## Acceptance Criteria

- Projects can optionally belong to organizations
- Org members can see org projects
- Backward compatible (existing projects still work without org)
