"""Feature spec — must mirror lib/types.ts FEATURE_KEYS exactly."""
FEATURE_KEYS = [
    "daysSinceCommit",
    "commits30",
    "commits90",
    "commits180",
    "commits365",
    "commitSlope",
    "authors90",
    "authors365",
    "busFactor",
    "daysSinceRelease",
    "releases365",
    "issueCloseRate180",
    "medianFirstResponseHrs",
    "prMergeRate180",
    "stalePrs",
    "openIssues",
    "repoAgeDays",
    "hasCi",
    "hasFunding",
    "orgOwned",
    "archived",
    "deprecated",
    "logWeeklyDownloads",
    "downloadsTrend",
]

LABEL = "abandoned_12m"
SNAPSHOT_T0 = "2025-10-27"
