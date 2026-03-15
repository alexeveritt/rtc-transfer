#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm --filter @rtc-transfer/web build

# Cloudflare Pages expects _worker.js in the static output directory.
# Bundle the server entry + its chunks into a single file.
node scripts/bundle-worker.mjs

echo "Pages build complete"
