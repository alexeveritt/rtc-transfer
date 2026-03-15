#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm --filter @rtc-transfer/web build

# Cloudflare Pages expects _worker.js in the static output directory.
# Bundle the server entry + its chunks into a single file.
node scripts/bundle-worker.mjs

# Tell Pages to serve static assets directly and only route
# non-asset requests through the worker.
cat > apps/web/build/client/_routes.json << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*"]
}
EOF

echo "Pages build complete"
