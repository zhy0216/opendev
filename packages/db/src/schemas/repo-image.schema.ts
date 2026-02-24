import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./user.schema";

export const repoImage = pgTable(
	"repo_image",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		repoOwner: text("repoOwner").notNull(),
		repoName: text("repoName").notNull(),
		imageId: text("imageId").notNull(),
		baseSha: text("baseSha").notNull(),
		status: text("status").notNull().default("building"),
		sizeMb: integer("sizeMb"),
		buildDurationMs: integer("buildDurationMs"),
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
	(table) => [index("repo_image_repo_idx").on(table.repoOwner, table.repoName)],
);

export const repoImageRelations = relations(repoImage, ({ one }) => ({
	creator: one(user, {
		fields: [repoImage.createdBy],
		references: [user.id],
	}),
}));
