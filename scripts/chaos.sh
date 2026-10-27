#!/usr/bin/env bash
# Chaos demo: prove ExhumeWorkflow survives a worker kill with no duplicate work.
# Requires: Temporal dev server (`temporal server start-dev`) + worker running.
set -euo pipefail

echo "1. start a scan → workflow exhume-<id> begins on task queue 'revenant'"
echo "2. kill -9 the worker mid-scan"
echo "3. restart the worker — the workflow resumes from its last activity"
echo "   with zero duplicate side effects (activities are idempotent)."
echo ""
echo "demo:"
echo "  terminal A: temporal server start-dev"
echo "  terminal B: npx tsx temporal/worker.ts"
echo "  terminal C: curl -X POST localhost:3000/api/scan -d '{\"manifest\": ...}'"
echo "  terminal B: Ctrl+C mid-scan"
echo "  terminal B: npx tsx temporal/worker.ts   # watch it resume"
echo "  inspect:    temporal workflow show -w exhume-<id>"
