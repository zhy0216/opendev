import type { DbClient } from "@repo/db";
import * as schema from "@repo/db/schema";
import { env } from "@repo/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { v4 as uuidv4 } from "uuid";

export function createAuth(db: DbClient) {
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		emailAndPassword: {
			enabled: false,
		},
		socialProviders: {
			github: {
				clientId: env.GITHUB_APP_CLIENT_ID,
				clientSecret: env.GITHUB_APP_CLIENT_SECRET
			},
		},
		account: {
			accountLinking: {
				enabled: false,
			},
		},
		advanced: {
			database: {
				generateId: () => uuidv4(),
			},
		},
		trustedOrigins: [
			"http://localhost:5173",
			"http://localhost:3000",
			env.BETTER_AUTH_URL,
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;

export const IAuth = Symbol.for("IAuth");
