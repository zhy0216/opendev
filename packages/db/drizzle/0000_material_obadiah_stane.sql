CREATE TABLE "integration_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid,
	"type" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid,
	"modelId" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"organizationId" uuid NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_organizationId_userId_pk" PRIMARY KEY("organizationId","userId")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"repoOwner" text NOT NULL,
	"repoName" text NOT NULL,
	"repoId" text,
	"defaultBranch" text DEFAULT 'main' NOT NULL,
	"organization_id" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_repo_owner_repo_name_unique" UNIQUE("repoOwner","repoName")
);
--> statement-breakpoint
CREATE TABLE "project_user" (
	"projectId" uuid NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_user_projectId_userId_pk" PRIMARY KEY("projectId","userId")
);
--> statement-breakpoint
CREATE TABLE "repo_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repoOwner" text NOT NULL,
	"repoName" text NOT NULL,
	"imageId" text NOT NULL,
	"baseSha" text NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"sizeMb" integer,
	"buildDurationMs" integer,
	"createdBy" text NOT NULL,
	"projectId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"externalSandboxId" text,
	"snapshotId" text,
	"authTokenHash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"lastHeartbeat" timestamp with time zone,
	"lastActivity" timestamp with time zone,
	"spawnFailureCount" integer DEFAULT 0 NOT NULL,
	"lastSpawnFailure" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sandbox_sessionId_unique" UNIQUE("sessionId")
);
--> statement-breakpoint
CREATE TABLE "global_secret" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid,
	"key" text NOT NULL,
	"encryptedValue" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "global_secret_organization_id_key_unique" UNIQUE("organizationId","key")
);
--> statement-breakpoint
CREATE TABLE "repo_secret" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repoOwner" text NOT NULL,
	"repoName" text NOT NULL,
	"key" text NOT NULL,
	"encryptedValue" text NOT NULL,
	"createdBy" text NOT NULL,
	"projectId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repo_secret_repo_owner_repo_name_key_unique" UNIQUE("repoOwner","repoName","key")
);
--> statement-breakpoint
CREATE TABLE "agent_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"repoOwner" text,
	"repoName" text,
	"repoId" text,
	"branchName" text,
	"baseSha" text,
	"currentSha" text,
	"model" text DEFAULT 'anthropic/claude-sonnet-4-6' NOT NULL,
	"reasoningEffort" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdBy" text NOT NULL,
	"organizationId" uuid,
	"projectId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"messageId" uuid,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"model" text,
	"reasoningEffort" text,
	"attachments" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"scmLogin" text,
	"joinedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "integration_setting" ADD CONSTRAINT "integration_setting_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_preference" ADD CONSTRAINT "model_preference_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user" ADD CONSTRAINT "project_user_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user" ADD CONSTRAINT "project_user_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_image" ADD CONSTRAINT "repo_image_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_image" ADD CONSTRAINT "repo_image_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox" ADD CONSTRAINT "sandbox_sessionId_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_secret" ADD CONSTRAINT "global_secret_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_secret" ADD CONSTRAINT "global_secret_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_secret" ADD CONSTRAINT "repo_secret_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_secret" ADD CONSTRAINT "repo_secret_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_artifact" ADD CONSTRAINT "session_artifact_sessionId_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_event" ADD CONSTRAINT "session_event_sessionId_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_event" ADD CONSTRAINT "session_event_messageId_session_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."session_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_message" ADD CONSTRAINT "session_message_sessionId_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_message" ADD CONSTRAINT "session_message_authorId_session_participant_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."session_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participant" ADD CONSTRAINT "session_participant_sessionId_agent_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participant" ADD CONSTRAINT "session_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_organization_id_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repo_image_repo_idx" ON "repo_image" USING btree ("repoOwner","repoName");--> statement-breakpoint
CREATE INDEX "sandbox_session_id_idx" ON "sandbox" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "repo_secret_repo_owner_repo_name_idx" ON "repo_secret" USING btree ("repoOwner","repoName");--> statement-breakpoint
CREATE INDEX "agent_session_status_idx" ON "agent_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_session_created_by_idx" ON "agent_session" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "agent_session_organization_id_idx" ON "agent_session" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "agent_session_project_id_idx" ON "agent_session" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "session_event_session_id_idx" ON "session_event" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "session_event_type_idx" ON "session_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "session_message_session_id_idx" ON "session_message" USING btree ("sessionId");