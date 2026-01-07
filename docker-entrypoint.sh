#!/bin/sh
set -e

# Ensure timezone is set for Node.js
export TZ=Europe/Paris

echo "🕐 Timezone: $TZ ($(date))"
echo "🔄 Synchronizing database schema..."
npx prisma db push --accept-data-loss --skip-generate 2>/dev/null || echo "⚠️ Schema sync skipped (may already be up to date)"

echo "🚀 Starting application..."
exec node server.js
