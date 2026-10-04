-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'a.',
    "language" TEXT NOT NULL DEFAULT 'en',
    "jtcEnabled" BOOLEAN NOT NULL DEFAULT false,
    "jtcChannel" TEXT,
    "jtcCategory" TEXT,
    "jtcDefaultName" TEXT NOT NULL DEFAULT '%{VAR}% channel',
    "counterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "counterCategory" TEXT,
    "counterChannels" JSONB NOT NULL DEFAULT '{}',
    "levelsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "levelsIgnoreChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "levelsIgnoreRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "levelsRoles" JSONB NOT NULL DEFAULT '{}',
    "levelsMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "levelsMessageChannel" TEXT,
    "levelsMessageContent" JSONB NOT NULL DEFAULT '{}',
    "levelsMessageDelete" INTEGER NOT NULL DEFAULT 15,
    "findTeamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "findTeamChannel" TEXT,
    "findTeamSendChannel" TEXT,
    "findTeamSelectPlaceholder" TEXT,
    "findTeamEmbed" JSONB NOT NULL DEFAULT '{"title":null,"description":null,"color":null,"thumbnail":null,"image":null,"footer":null}',
    "findTeamGames" JSONB NOT NULL DEFAULT '[]',
    "giveaways" JSONB NOT NULL DEFAULT '[]',
    "currencyEmoji" TEXT,
    "currencyId" TEXT,
    "shopRoles" JSONB NOT NULL DEFAULT '[]',
    "workEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workCooldown" INTEGER NOT NULL DEFAULT 1800,
    "workMin" INTEGER NOT NULL DEFAULT 100,
    "workMax" INTEGER NOT NULL DEFAULT 500,
    "timelyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timelyAmount" INTEGER NOT NULL DEFAULT 400,
    "dailyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyAmount" INTEGER NOT NULL DEFAULT 800,
    "weeklyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyAmount" INTEGER NOT NULL DEFAULT 3000,
    "levelUpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "levelUpAmount" INTEGER NOT NULL DEFAULT 250,
    "bumpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bumpAmount" INTEGER NOT NULL DEFAULT 350,
    "robEnabled" BOOLEAN NOT NULL DEFAULT false,
    "robCooldown" INTEGER NOT NULL DEFAULT 3600,
    "robIncome" JSONB NOT NULL DEFAULT '{"min":100,"max":500,"type":"fixed"}',
    "robPunishment" JSONB NOT NULL DEFAULT '{"min":10,"max":50,"type":"fixed","fail_chance":25}',
    "moderationRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modLogChannel" TEXT,
    "modDmNotify" BOOLEAN NOT NULL DEFAULT true,
    "modWarnExpiry" INTEGER NOT NULL DEFAULT 0,
    "modWarnThresholds" JSONB NOT NULL DEFAULT '[]',
    "modReportForm" JSONB NOT NULL DEFAULT '{"enabled":false,"channel":null,"cooldown":600,"max_pending":3,"allow_anonymous":false,"require_target":true,"allow_banned":false,"fields":[],"success_message":null,"approve_message":null,"reject_message":null}',
    "modAppealForm" JSONB NOT NULL DEFAULT '{"enabled":false,"channel":null,"cooldown":86400,"max_pending":1,"allow_anonymous":false,"require_target":false,"allow_banned":true,"fields":[],"success_message":null,"approve_message":null,"reject_message":null}',
    "modCaseSeq" INTEGER NOT NULL DEFAULT 0,
    "modReportSeq" INTEGER NOT NULL DEFAULT 0,
    "modAppealSeq" INTEGER NOT NULL DEFAULT 0,
    "inviteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inviteIgnoreChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inviteIgnoreRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inviteDeleteMessage" BOOLEAN NOT NULL DEFAULT false,
    "inviteModerationImmune" BOOLEAN NOT NULL DEFAULT false,
    "invitePunishment" JSONB NOT NULL DEFAULT '{"type":"warn","time":0,"reason":"Auto moderation"}',
    "linksEnabled" BOOLEAN NOT NULL DEFAULT false,
    "linksIgnoreChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linksIgnoreRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linksIgnoreLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linksDeleteMessage" BOOLEAN NOT NULL DEFAULT false,
    "linksModerationImmune" BOOLEAN NOT NULL DEFAULT false,
    "linksPunishment" JSONB NOT NULL DEFAULT '{"type":"warn","time":0,"reason":"Auto moderation"}',
    "auditEnabled" BOOLEAN NOT NULL DEFAULT false,
    "auditChannel" TEXT,
    "auditIgnoreChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auditIgnoreRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auditIgnoreBots" BOOLEAN NOT NULL DEFAULT true,
    "auditWebhookName" TEXT,
    "auditWebhookAvatar" TEXT,
    "auditEvents" JSONB NOT NULL DEFAULT '{}',
    "commandPermissions" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceNumber" TEXT NOT NULL,
    "balanceMode" BOOLEAN NOT NULL DEFAULT false,
    "balanceSolid" JSONB NOT NULL DEFAULT '{"bg_color":"#000000","first_component":"#ffffff","second_component":"#C30F45","third_component":"#422242"}',
    "balanceUrl" TEXT,
    "profileBio" TEXT NOT NULL DEFAULT '',
    "profileMode" BOOLEAN NOT NULL DEFAULT false,
    "profileSolid" JSONB NOT NULL DEFAULT '{"bg_color":"#000000","first_component":"#422242","second_component":"#C30F45","third_component":"#422242"}',
    "profileUrl" TEXT,
    "profileColor" TEXT,
    "profileIcons" JSONB NOT NULL DEFAULT '[]',
    "profileIconsPadding" INTEGER NOT NULL DEFAULT 10,
    "rankMode" BOOLEAN NOT NULL DEFAULT false,
    "rankSolid" JSONB NOT NULL DEFAULT '{"bg_color":"#000000","first_component":"#ffffff","second_component":"#C30F45","third_component":"#422242"}',
    "rankUrl" TEXT,
    "rankColor" TEXT,
    "levelupMode" BOOLEAN NOT NULL DEFAULT false,
    "levelupSolid" JSONB NOT NULL DEFAULT '{"bg_color":"#000000","first_component":"#ffffff","second_component":"#422242","third_component":"#C30F45"}',
    "levelupUrl" TEXT,
    "customBadges" JSONB NOT NULL DEFAULT '[]',
    "jtcPresets" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWebhook" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "duration" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'command',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationSubmission" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT,
    "caseId" TEXT,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "response" TEXT,
    "channelId" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'update',
    "coverUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "component" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentUpdate" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bannerText" TEXT,
    "bannerVariant" TEXT NOT NULL DEFAULT 'warning',
    "inviteUrl" TEXT,
    "supportUrl" TEXT,
    "githubUrl" TEXT,
    "heroTagline" TEXT,
    "heroText" TEXT,
    "maintenance" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "serviceOverrides" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roles" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "roleCount" INTEGER NOT NULL,
    "channelCount" INTEGER NOT NULL,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guild_id_idx" ON "Guild"("id");

-- CreateIndex
CREATE INDEX "User_userId_guildId_idx" ON "User"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_guildId_key" ON "User"("userId", "guildId");

-- CreateIndex
CREATE INDEX "History_guildId_idx" ON "History"("guildId");

-- CreateIndex
CREATE INDEX "History_userId_idx" ON "History"("userId");

-- CreateIndex
CREATE INDEX "History_type_idx" ON "History"("type");

-- CreateIndex
CREATE INDEX "GuildWebhook_guildId_idx" ON "GuildWebhook"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWebhook_guildId_channelId_key" ON "GuildWebhook"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "ModerationCase_guildId_targetId_idx" ON "ModerationCase"("guildId", "targetId");

-- CreateIndex
CREATE INDEX "ModerationCase_guildId_type_active_idx" ON "ModerationCase"("guildId", "type", "active");

-- CreateIndex
CREATE INDEX "ModerationCase_expiresAt_idx" ON "ModerationCase"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationCase_guildId_caseNumber_key" ON "ModerationCase"("guildId", "caseNumber");

-- CreateIndex
CREATE INDEX "ModerationSubmission_guildId_kind_status_idx" ON "ModerationSubmission"("guildId", "kind", "status");

-- CreateIndex
CREATE INDEX "ModerationSubmission_guildId_authorId_idx" ON "ModerationSubmission"("guildId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationSubmission_guildId_kind_number_key" ON "ModerationSubmission"("guildId", "kind", "number");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_published_publishedAt_idx" ON "NewsPost"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsPost_category_idx" ON "NewsPost"("category");

-- CreateIndex
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");

-- CreateIndex
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");

-- CreateIndex
CREATE INDEX "IncidentUpdate_incidentId_idx" ON "IncidentUpdate"("incidentId");

-- CreateIndex
CREATE INDEX "Backup_guildId_idx" ON "Backup"("guildId");

-- CreateIndex
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWebhook" ADD CONSTRAINT "GuildWebhook_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationSubmission" ADD CONSTRAINT "ModerationSubmission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationSubmission" ADD CONSTRAINT "ModerationSubmission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUpdate" ADD CONSTRAINT "IncidentUpdate_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
