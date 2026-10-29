CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonProgress_userId_contentId_key"
ON "LessonProgress"("userId", "contentId");

CREATE INDEX "LessonProgress_userId_courseId_idx"
ON "LessonProgress"("userId", "courseId");

ALTER TABLE "LessonProgress"
ADD CONSTRAINT "LessonProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonProgress"
ADD CONSTRAINT "LessonProgress_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonProgress"
ADD CONSTRAINT "LessonProgress_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "CourseContent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
