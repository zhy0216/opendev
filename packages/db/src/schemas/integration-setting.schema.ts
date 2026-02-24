import { relations } from "drizzle-orm";
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";

export const integrationSetting = pgTable("integration_setting", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organizationId").references(() => organization.id, {
		onDelete: "set null",
	}),
	type: text("type").notNull(),
	config: jsonb("config").notNull(),
	enabled: boolean("enabled").notNull().default(true),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updatedAt", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const integrationSettingRelations = relations(
	integrationSetting,
	({ one }) => ({
		organization: one(organization, {
			fields: [integrationSetting.organizationId],
			references: [organization.id],
		}),
	}),
);
