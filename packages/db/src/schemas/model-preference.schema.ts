import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";

export const modelPreference = pgTable("model_preference", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organizationId").references(() => organization.id, {
		onDelete: "set null",
	}),
	modelId: text("modelId").notNull(),
	enabled: boolean("enabled").notNull().default(true),
	isDefault: boolean("isDefault").notNull().default(false),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const modelPreferenceRelations = relations(
	modelPreference,
	({ one }) => ({
		organization: one(organization, {
			fields: [modelPreference.organizationId],
			references: [organization.id],
		}),
	}),
);
