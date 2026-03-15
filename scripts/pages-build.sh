#!/usr/bin/env bash
set -euo pipefail

# Build the web app
pnpm install --frozen-lockfile
pnpm --filter @rtc-transfer/web build

# The @cloudflare/vite-plugin generates a wrangler.json inside build/server/
# with paths relative to that directory. Cloudflare Pages looks for wrangler
# config at the repo root, so we copy it there with adjusted paths.
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('apps/web/build/server/wrangler.json', 'utf8'));
  config.main = 'apps/web/build/server/index.js';
  config.assets.directory = 'apps/web/build/client';
  fs.writeFileSync('wrangler.json', JSON.stringify(config, null, 2));
"

echo "Pages build complete"
