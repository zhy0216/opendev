import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { agentSession } from "./session.schema";

export const sandbox = pgTable(
	"sandbox",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("sessionId")
			.notNull()
			.unique()
			.references(() => agentSession.id, { onDelete: "cascade" }),
		externalSandboxId: text("externalSandboxId"),
		snapshotId: text("snapshotId"),
		authTokenHash: text("authTokenHash"),
		status: text("status").notNull().default("pending"),
		lastHeartbeat: timestamp("lastHeartbeat", { withTimezone: true }),
		lastActivity: timestamp("lastActivity", { withTimezone: true }),
		spawnFailureCount: integer("spawnFailureCount").notNull().default(0),
		lastSpawnFailure: timestamp("lastSpawnFailure", { withTimezone: true }),
		createdAt: timestamp("createdAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updatedAt", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("sandbox_session_id_idx").on(table.sessionId)],
);

export const sandboxRelations = relations(sandbox, ({ one }) => ({
	session: one(agentSession, {
		fields: [sandbox.sessionId],
		references: [agentSession.id],
	}),
}));
