#!/bin/bash
# Deploy FlowBoard frontend to production
set -e

echo "🚀 Deploying to Vercel production..."
cd "$(dirname "$0")"

# Deploy and capture the URL
DEPLOY_URL=$(npx vercel --prod --yes 2>&1 | grep "https://" | grep "vercel.app" | head -1 | tr -d ' ')

echo "✅ Deployed: $DEPLOY_URL"
echo "🔗 Aliasing to flowboard-pied.vercel.app..."

npx vercel alias "$DEPLOY_URL" flowboard-pied.vercel.app

echo "✅ Live at https://flowboard-pied.vercel.app"
