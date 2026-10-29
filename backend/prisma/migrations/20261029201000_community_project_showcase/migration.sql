CREATE TABLE "ShowcaseProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "imagePaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowcaseProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowcaseProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseProjectComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShowcaseProjectLike" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseProjectLike_pkey" PRIMARY KEY ("userId", "projectId")
);

CREATE INDEX "ShowcaseProject_createdAt_idx" ON "ShowcaseProject"("createdAt");
CREATE INDEX "ShowcaseProject_userId_createdAt_idx" ON "ShowcaseProject"("userId", "createdAt");
CREATE INDEX "ShowcaseProjectComment_projectId_createdAt_idx" ON "ShowcaseProjectComment"("projectId", "createdAt");
CREATE INDEX "ShowcaseProjectComment_userId_createdAt_idx" ON "ShowcaseProjectComment"("userId", "createdAt");
CREATE INDEX "ShowcaseProjectLike_projectId_createdAt_idx" ON "ShowcaseProjectLike"("projectId", "createdAt");

ALTER TABLE "ShowcaseProject" ADD CONSTRAINT "ShowcaseProject_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseProjectComment" ADD CONSTRAINT "ShowcaseProjectComment_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ShowcaseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseProjectComment" ADD CONSTRAINT "ShowcaseProjectComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseProjectLike" ADD CONSTRAINT "ShowcaseProjectLike_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ShowcaseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseProjectLike" ADD CONSTRAINT "ShowcaseProjectLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
