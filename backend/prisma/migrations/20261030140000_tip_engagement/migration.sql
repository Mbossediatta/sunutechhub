CREATE TABLE "TipComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipLike" (
    "userId" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipLike_pkey" PRIMARY KEY ("userId", "tipId")
);

CREATE INDEX "TipComment_tipId_createdAt_idx" ON "TipComment"("tipId", "createdAt");
CREATE INDEX "TipLike_tipId_idx" ON "TipLike"("tipId");

ALTER TABLE "TipComment" ADD CONSTRAINT "TipComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipComment" ADD CONSTRAINT "TipComment_tipId_fkey"
    FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipLike" ADD CONSTRAINT "TipLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipLike" ADD CONSTRAINT "TipLike_tipId_fkey"
    FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
