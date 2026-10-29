ALTER TABLE "Payment"
ADD COLUMN "manualVerifiedAt" TIMESTAMP(3),
ADD COLUMN "manualVerifierId" TEXT;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_manualVerifierId_fkey"
FOREIGN KEY ("manualVerifierId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_manualVerifierId_idx" ON "Payment"("manualVerifierId");
