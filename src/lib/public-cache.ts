export const PUBLIC_CACHE_CONTROL =
  "public, max-age=15, s-maxage=30, stale-while-revalidate=120";

export const PUBLIC_CACHE_TAGS = {
  courses: "public-courses",
  events: "public-events",
  jobs: "public-jobs",
  projects: "public-projects",
  questions: "public-questions",
  tips: "public-tips",
} as const;
