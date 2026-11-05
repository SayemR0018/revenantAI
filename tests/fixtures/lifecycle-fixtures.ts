// README & vitals fixtures for offline Vitest lifecycle tests (no network).
import { VitalSigns } from '@/lib/types';

export const MOMENT_LIKE_VITALS: VitalSigns = {
  daysSinceCommit: 21,
  daysSinceRelease: 44,
  weeklyDownloads: 33_787_344,
  downloadsTrend: 0.71,
  dependents: 1_006_179,
  yearsActive: 15,
  archived: false,
  deprecated: false,
  commitsPerWeek: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 0, 25, 16, 3, 3, 2, 10, 0, 0, 2, 0, 0, 0],
};

export const POSITIVE_README_FIXTURES = {
  momentReadme: `# [Moment.js](https://momentjs.com/)

[![NPM version][npm-version-image]][npm-url]

A JavaScript date library for parsing, validating, manipulating, and formatting dates.

> ⚠️ Moment.js is a legacy project, now in **maintenance mode**. New features
> are not being accepted. For more details, see the
> [latest project status update](https://momentjs.com/news/).
`,
  unmaintainedNotice: `# old-widget

⚠️ **Status:** This package is no longer actively maintained. Please migrate to modern alternatives.
`,
  seekingMaintainersNotice: `# fast-queue

## Project Status

We are looking for new maintainers to take over this project and review pull requests.
`,
  legacyNotice: `# classic-router

This is a legacy project. You should choose a different library for new applications.
`,
  sunsetNotice: `# v1-sdk

## Deprecation Notice

This package will be deprecated in Q4 and is superseded by @acme/v2-sdk.
`,
};

export const NEGATIVE_README_FIXTURES = {
  notInMaintenanceMode: `# active-lib

active-lib is under active development and is not in maintenance mode. We ship new features every month!
`,
  noLongerInMaintenance: `# revived-lib

After the 2025 rewrite, this library is no longer in maintenance mode and is actively developed.
`,
  maintenanceRelease: `# steady-lib

## Release Notes

v3.4.2 is a maintenance release containing bug fixes for Node 24 compatibility. For routine maintenance of your install, run the doctor command.
`,
  codeFenceMention: `# status-checker

Example configuration for checking whether a service is in maintenance mode:

\`\`\`ts
// This project is in maintenance mode and unmaintained
const config = {
  status: "maintenance mode",
  message: "This package is no longer actively maintained"
};
\`\`\`
`,
  wasInMaintenanceNowActive: `# phoenix-orm

phoenix-orm was in maintenance mode, now actively developed by the new core team.
`,
  contributingMaintenanceHeading: `# healthy-pkg

A fast utility library.

## Contributing

### Maintenance

Maintainers merge pull requests weekly and tag patch releases on Fridays. No new features without an RFC issue first.
`,
};
