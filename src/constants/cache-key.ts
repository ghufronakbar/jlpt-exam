// Centralized cache keys/tags for `unstable_cache` + `revalidateTag`.
// Never hardcode cache key/tag strings inside server actions — import from here.

export const CACHE_TAGS = {
  testPackageList: "test-package-list",
  testPackageDetail: (testPackageId: number) => `test-package-${testPackageId}`,
  testPackageQuestions: (testPackageId: number) => `test-package-questions-${testPackageId}`,
  attemptSummary: (attemptId: number) => `attempt-${attemptId}`,
  dashboardSummary: (userId: number) => `dashboard-${userId}`,
  analytics: (userId: number) => `analytics-${userId}`,
} as const;

export const CACHE_KEYS = {
  testPackageList: ["test-package-list"] as string[],
  testPackageDetail: (testPackageId: number) => ["test-package-detail", String(testPackageId)],
  testPackageQuestions: (testPackageId: number) => [
    "test-package-questions",
    String(testPackageId),
  ],
  attemptSummary: (attemptId: number) => ["attempt-summary", String(attemptId)],
  dashboardSummary: (userId: number) => ["dashboard-summary", String(userId)],
  analytics: (userId: number) => ["analytics", String(userId)],
};
