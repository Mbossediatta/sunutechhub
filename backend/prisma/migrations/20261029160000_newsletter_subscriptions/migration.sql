ALTER TABLE "User"
ADD COLUMN "newsletterSubscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "newsletterSubscribedAt" TIMESTAMP(3);

CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterDelivery_announcementId_userId_key"
ON "NewsletterDelivery"("announcementId", "userId");
CREATE INDEX "NewsletterDelivery_sentAt_cancelledAt_nextAttemptAt_idx"
ON "NewsletterDelivery"("sentAt", "cancelledAt", "nextAttemptAt");

ALTER TABLE "NewsletterDelivery"
ADD CONSTRAINT "NewsletterDelivery_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterDelivery"
ADD CONSTRAINT "NewsletterDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
