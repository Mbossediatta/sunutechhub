CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key"
ON "NewsletterSubscriber"("email");

ALTER TABLE "NewsletterDelivery"
ADD COLUMN "campaignKey" TEXT,
ADD COLUMN "eventId" TEXT,
ADD COLUMN "subscriberId" TEXT,
ADD COLUMN "recipientEmail" TEXT,
ADD COLUMN "subject" TEXT,
ADD COLUMN "body" TEXT,
ADD COLUMN "link" TEXT;

UPDATE "NewsletterDelivery" AS delivery
SET
    "campaignKey" = 'announcement:' || delivery."announcementId",
    "recipientEmail" = LOWER("User"."email"),
    "subject" = "Announcement"."title",
    "body" = "Announcement"."body",
    "link" = "Announcement"."link"
FROM "User", "Announcement"
WHERE delivery."userId" = "User"."id"
  AND delivery."announcementId" = "Announcement"."id";

ALTER TABLE "NewsletterDelivery"
ALTER COLUMN "campaignKey" SET NOT NULL,
ALTER COLUMN "recipientEmail" SET NOT NULL,
ALTER COLUMN "subject" SET NOT NULL,
ALTER COLUMN "body" SET NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "announcementId" DROP NOT NULL;

CREATE UNIQUE INDEX "NewsletterDelivery_campaignKey_recipientEmail_key"
ON "NewsletterDelivery"("campaignKey", "recipientEmail");

CREATE INDEX "NewsletterDelivery_subscriberId_idx"
ON "NewsletterDelivery"("subscriberId");

CREATE INDEX "NewsletterDelivery_eventId_idx"
ON "NewsletterDelivery"("eventId");

ALTER TABLE "NewsletterDelivery"
ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey"
FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsletterDelivery"
ADD CONSTRAINT "NewsletterDelivery_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
