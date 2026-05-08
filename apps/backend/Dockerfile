# ─── Stage 1: Build ──────────────────────────────────────────────────────────
# Build context must be the monorepo root so @flowboard/shared is accessible
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copy workspace manifest files first (layer cache)
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all workspace dependencies (creates symlinks for @flowboard/shared)
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Generate Prisma client
RUN npm run db:generate --workspace=apps/backend

# Build shared package (backend depends on its compiled output)
RUN npm run build --workspace=packages/shared

# Build backend
RUN npm run build --workspace=apps/backend

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules from builder — preserves workspace symlinks for @flowboard/shared
COPY --from=builder /app/node_modules ./node_modules

# Copy shared package (runtime resolution target of @flowboard/shared symlink)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy backend compiled output and prisma files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

# Run DB schema sync then start server
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss && cd /app && node apps/backend/dist/server.js"]
