CREATE TYPE "CourseContentType" AS ENUM ('VIDEO', 'RESOURCE', 'LIVE_SESSION');

CREATE TABLE "CourseContent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" "CourseContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseContent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseContent_courseId_published_position_idx"
ON "CourseContent"("courseId", "published", "position");

ALTER TABLE "CourseContent"
ADD CONSTRAINT "CourseContent_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
