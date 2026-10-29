CREATE TABLE "CourseContentNotification" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseContentNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseContentNotification_contentId_recipient_key"
ON "CourseContentNotification"("contentId", "recipient");
CREATE INDEX "CourseContentNotification_sentAt_nextAttemptAt_idx"
ON "CourseContentNotification"("sentAt", "nextAttemptAt");

ALTER TABLE "CourseContentNotification"
ADD CONSTRAINT "CourseContentNotification_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "CourseContent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommunityAnswerComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CommunityAnswerComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityAnswerComment_answerId_createdAt_idx"
ON "CommunityAnswerComment"("answerId", "createdAt");
CREATE INDEX "CommunityAnswerComment_userId_createdAt_idx"
ON "CommunityAnswerComment"("userId", "createdAt");

ALTER TABLE "CommunityAnswerComment"
ADD CONSTRAINT "CommunityAnswerComment_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "CommunityAnswer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAnswerComment"
ADD CONSTRAINT "CommunityAnswerComment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommunityAnswerLike" (
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityAnswerLike_pkey" PRIMARY KEY ("userId", "answerId")
);

CREATE INDEX "CommunityAnswerLike_answerId_createdAt_idx"
ON "CommunityAnswerLike"("answerId", "createdAt");

ALTER TABLE "CommunityAnswerLike"
ADD CONSTRAINT "CommunityAnswerLike_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "CommunityAnswer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAnswerLike"
ADD CONSTRAINT "CommunityAnswerLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
