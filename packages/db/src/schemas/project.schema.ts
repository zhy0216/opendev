import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, primaryKey, index, unique } from 'drizzle-orm/pg-core';
import { user } from './user.schema';
import { organization } from './organization.schema';

export const project = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    repoOwner: text('repoOwner').notNull(),
    repoName: text('repoName').notNull(),
    repoId: text('repoId'),
    defaultBranch: text('defaultBranch').notNull().default('main'),
    organizationId: uuid('organization_id').references(() => organization.id),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_organization_id_idx').on(table.organizationId),
    unique('project_repo_owner_repo_name_unique').on(table.repoOwner, table.repoName),
  ]
);

export const projectRelations = relations(project, ({ one }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
}));

export const projectUser = pgTable(
  'project_user',
  {
    projectId: uuid('projectId')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
);
