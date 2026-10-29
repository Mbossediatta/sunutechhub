ALTER TABLE "Attestation"
ALTER COLUMN "paymentId" DROP NOT NULL;

ALTER TABLE "Attestation"
ADD COLUMN "freeCourseKey" TEXT;

CREATE UNIQUE INDEX "Attestation_freeCourseKey_key"
ON "Attestation"("freeCourseKey");
