#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm --filter @rtc-transfer/web build

# Bundle the server into _worker.js for Cloudflare Pages.
node scripts/bundle-worker.mjs

# Ensure static assets are served directly, not through the worker.
cat > apps/web/build/client/_routes.json << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*"]
}
EOF

echo "Pages build complete"
