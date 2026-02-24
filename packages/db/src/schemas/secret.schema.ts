import { relations } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { user } from "./user.schema";

export const repoSecret = pgTable(
	"repo_secret",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		repoOwner: text("repoOwner").notNull(),
		repoName: text("repoName").notNull(),
		key: text("key").notNull(),
		encryptedValue: text("encryptedValue").notNull(),
		createdBy: text("createdBy")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updatedAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("repo_secret_repo_owner_repo_name_key_unique").on(
			table.repoOwner,
			table.repoName,
			table.key,
		),
		index("repo_secret_repo_owner_repo_name_idx").on(
			table.repoOwner,
			table.repoName,
		),
	],
);

export const repoSecretRelations = relations(repoSecret, ({ one }) => ({
	creator: one(user, {
		fields: [repoSecret.createdBy],
		references: [user.id],
	}),
}));

export const globalSecret = pgTable(
	"global_secret",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organizationId").references(() => organization.id, {
			onDelete: "set null",
		}),
		key: text("key").notNull(),
		encryptedValue: text("encryptedValue").notNull(),
		createdBy: text("createdBy")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updatedAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("global_secret_organization_id_key_unique").on(
			table.organizationId,
			table.key,
		),
	],
);

export const globalSecretRelations = relations(globalSecret, ({ one }) => ({
	organization: one(organization, {
		fields: [globalSecret.organizationId],
		references: [organization.id],
	}),
	creator: one(user, {
		fields: [globalSecret.createdBy],
		references: [user.id],
	}),
}));
