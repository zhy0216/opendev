import { pgTable, text, timestamp, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { user } from './user.schema';
import { organization } from './organization.schema';

export const project = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    organizationId: uuid('organization_id').references(() => organization.id),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('project_organization_id_idx').on(table.organizationId)]
);

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
