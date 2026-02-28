import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { project } from "./project.schema";
import { user } from "./user.schema";

export const agentSession = pgTable(
	"agent_session",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		title: text("title"),
		repoOwner: text("repoOwner"),
		repoName: text("repoName"),
		repoId: text("repoId"),
		branchName: text("branchName"),
		baseSha: text("baseSha"),
		currentSha: text("currentSha"),
		model: text("model").notNull().default("anthropic/claude-sonnet-4-6"),
		reasoningEffort: text("reasoningEffort").notNull().default("medium"),
		status: text("status").notNull().default("pending"),
		createdBy: text("createdBy")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: uuid("organizationId").references(() => organization.id, {
			onDelete: "set null",
		}),
		projectId: uuid("projectId").references(() => project.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updatedAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("agent_session_status_idx").on(table.status),
		index("agent_session_created_by_idx").on(table.createdBy),
		index("agent_session_organization_id_idx").on(table.organizationId),
		index("agent_session_project_id_idx").on(table.projectId),
	],
);

export const agentSessionRelations = relations(
	agentSession,
	({ one, many }) => ({
		creator: one(user, {
			fields: [agentSession.createdBy],
			references: [user.id],
		}),
		organization: one(organization, {
			fields: [agentSession.organizationId],
			references: [organization.id],
		}),
		project: one(project, {
			fields: [agentSession.projectId],
			references: [project.id],
		}),
		participants: many(sessionParticipant),
		messages: many(sessionMessage),
		events: many(sessionEvent),
		artifacts: many(sessionArtifact),
	}),
);

export const sessionParticipant = pgTable("session_participant", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("sessionId")
		.notNull()
		.references(() => agentSession.id, { onDelete: "cascade" }),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	role: text("role").notNull().default("owner"),
	scmLogin: text("scmLogin"),
	joinedAt: timestamp("joinedAt", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const sessionParticipantRelations = relations(
	sessionParticipant,
	({ one, many }) => ({
		session: one(agentSession, {
			fields: [sessionParticipant.sessionId],
			references: [agentSession.id],
		}),
		user: one(user, {
			fields: [sessionParticipant.userId],
			references: [user.id],
		}),
		messages: many(sessionMessage),
	}),
);

export const sessionMessage = pgTable(
	"session_message",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("sessionId")
			.notNull()
			.references(() => agentSession.id, { onDelete: "cascade" }),
		authorId: uuid("authorId")
			.notNull()
			.references(() => sessionParticipant.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		source: text("source").notNull().default("web"),
		model: text("model"),
		reasoningEffort: text("reasoningEffort"),
		attachments: jsonb("attachments"),
		status: text("status").notNull().default("pending"),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
		startedAt: timestamp("startedAt", { withTimezone: true }),
		completedAt: timestamp("completedAt", { withTimezone: true }),
	},
	(table) => [index("session_message_session_id_idx").on(table.sessionId)],
);

export const sessionMessageRelations = relations(
	sessionMessage,
	({ one, many }) => ({
		session: one(agentSession, {
			fields: [sessionMessage.sessionId],
			references: [agentSession.id],
		}),
		author: one(sessionParticipant, {
			fields: [sessionMessage.authorId],
			references: [sessionParticipant.id],
		}),
		events: many(sessionEvent),
	}),
);

export const sessionEvent = pgTable(
	"session_event",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("sessionId")
			.notNull()
			.references(() => agentSession.id, { onDelete: "cascade" }),
		messageId: uuid("messageId").references(() => sessionMessage.id, {
			onDelete: "set null",
		}),
		type: text("type").notNull(),
		data: jsonb("data").notNull(),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("session_event_session_id_idx").on(table.sessionId),
		index("session_event_type_idx").on(table.type),
	],
);

export const sessionEventRelations = relations(sessionEvent, ({ one }) => ({
	session: one(agentSession, {
		fields: [sessionEvent.sessionId],
		references: [agentSession.id],
	}),
	message: one(sessionMessage, {
		fields: [sessionEvent.messageId],
		references: [sessionMessage.id],
	}),
}));

export const sessionArtifact = pgTable("session_artifact", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("sessionId")
		.notNull()
		.references(() => agentSession.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	url: text("url").notNull(),
	metadata: jsonb("metadata"),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const sessionArtifactRelations = relations(
	sessionArtifact,
	({ one }) => ({
		session: one(agentSession, {
			fields: [sessionArtifact.sessionId],
			references: [agentSession.id],
		}),
	}),
);
