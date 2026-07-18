-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('free', 'starter', 'growth');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'staff');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('email', 'phone', 'anon');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('granted', 'withdrawn');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('widget', 'api');

-- CreateEnum
CREATE TYPE "DprType" AS ENUM ('access', 'correction', 'erasure', 'grievance', 'nomination');

-- CreateEnum
CREATE TYPE "DprStatus" AS ENUM ('open', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('open', 'reported', 'closed');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('admin', 'system');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "apiKey" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedOrigin" TEXT,
    "planTier" "PlanTier" NOT NULL DEFAULT 'free',
    "razorpayCustomerId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "planRenewsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_purposes" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryKey" TEXT NOT NULL DEFAULT '',
    "involvesMinors" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_versions" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "bodyText" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_principals" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "identifierType" "IdentifierType" NOT NULL DEFAULT 'anon',
    "identifierEnc" TEXT NOT NULL,
    "identifierHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_principals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "noticeVersionId" TEXT NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "method" "ConsentMethod" NOT NULL DEFAULT 'widget',
    "eventId" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dpr_requests" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dataPrincipalId" TEXT,
    "type" "DprType" NOT NULL,
    "detailsEnc" TEXT NOT NULL,
    "status" "DprStatus" NOT NULL DEFAULT 'open',
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "dpr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_incidents" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "reportedToBoardAt" TIMESTAMP(3),
    "affectedUsersNotifiedAt" TIMESTAMP(3),
    "status" "BreachStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breach_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parental_consents" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "guardianRef" TEXT NOT NULL,
    "verificationToken" TEXT,
    "pendingPurposes" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "verifiedAt" TIMESTAMP(3),
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parental_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "actorType" "ActorType" NOT NULL DEFAULT 'admin',
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetTable" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_users_tenantId_idx" ON "admin_users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_tenantId_email_key" ON "admin_users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_apiKey_key" ON "sites"("apiKey");

-- CreateIndex
CREATE INDEX "sites_tenantId_idx" ON "sites"("tenantId");

-- CreateIndex
CREATE INDEX "consent_purposes_siteId_idx" ON "consent_purposes"("siteId");

-- CreateIndex
CREATE INDEX "notice_versions_siteId_language_idx" ON "notice_versions"("siteId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "notice_versions_siteId_language_version_key" ON "notice_versions"("siteId", "language", "version");

-- CreateIndex
CREATE INDEX "data_principals_siteId_idx" ON "data_principals"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "data_principals_siteId_identifierHash_key" ON "data_principals"("siteId", "identifierHash");

-- CreateIndex
CREATE INDEX "consent_records_siteId_timestamp_idx" ON "consent_records"("siteId", "timestamp");

-- CreateIndex
CREATE INDEX "consent_records_siteId_purposeId_idx" ON "consent_records"("siteId", "purposeId");

-- CreateIndex
CREATE INDEX "consent_records_dataPrincipalId_purposeId_timestamp_idx" ON "consent_records"("dataPrincipalId", "purposeId", "timestamp");

-- CreateIndex
CREATE INDEX "consent_records_eventId_idx" ON "consent_records"("eventId");

-- CreateIndex
CREATE INDEX "dpr_requests_siteId_status_idx" ON "dpr_requests"("siteId", "status");

-- CreateIndex
CREATE INDEX "breach_incidents_siteId_idx" ON "breach_incidents"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "parental_consents_verificationToken_key" ON "parental_consents"("verificationToken");

-- CreateIndex
CREATE INDEX "parental_consents_siteId_idx" ON "parental_consents"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_timestamp_idx" ON "audit_logs"("tenantId", "timestamp");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_purposes" ADD CONSTRAINT "consent_purposes_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_versions" ADD CONSTRAINT "notice_versions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_principals" ADD CONSTRAINT "data_principals_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "data_principals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "consent_purposes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_noticeVersionId_fkey" FOREIGN KEY ("noticeVersionId") REFERENCES "notice_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpr_requests" ADD CONSTRAINT "dpr_requests_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpr_requests" ADD CONSTRAINT "dpr_requests_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "data_principals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

