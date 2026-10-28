CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'SOLVED', 'HIDDEN');
CREATE TYPE "ContentReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');
CREATE TYPE "CommunityEventMode" AS ENUM ('ONLINE', 'IN_PERSON');
CREATE TYPE "JobType" AS ENUM ('EMPLOYMENT', 'INTERNSHIP', 'CONTRACT');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'CLOSED');

CREATE TABLE "CommunityQuestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityAnswer" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CommunityAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reporterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "questionId" TEXT,
    "answerId" TEXT,
    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "mode" "CommunityEventMode" NOT NULL,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobOffer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applyUrl" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    CONSTRAINT "JobOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");
CREATE INDEX "CommunityQuestion_status_createdAt_idx" ON "CommunityQuestion"("status", "createdAt");
CREATE INDEX "CommunityQuestion_userId_createdAt_idx" ON "CommunityQuestion"("userId", "createdAt");
CREATE INDEX "CommunityAnswer_questionId_hidden_createdAt_idx" ON "CommunityAnswer"("questionId", "hidden", "createdAt");
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");
CREATE INDEX "CommunityEvent_active_startsAt_idx" ON "CommunityEvent"("active", "startsAt");
CREATE INDEX "EventRegistration_userId_createdAt_idx" ON "EventRegistration"("userId", "createdAt");
CREATE INDEX "JobOffer_status_createdAt_idx" ON "JobOffer"("status", "createdAt");

ALTER TABLE "CommunityQuestion" ADD CONSTRAINT "CommunityQuestion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAnswer" ADD CONSTRAINT "CommunityAnswer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "CommunityQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAnswer" ADD CONSTRAINT "CommunityAnswer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "CommunityQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "CommunityAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
