#!/usr/bin/env bash

set -euo pipefail

# Allow overriding the preview port through an argument or DEPLOY_PORT env variable.
PORT="${1:-${DEPLOY_PORT:-4280}}"

echo "Building production assets..."
npm run build

echo "Starting preview server on port ${PORT} (host: 0.0.0.0)..."
npx vite preview --host 0.0.0.0 --port "${PORT}"
