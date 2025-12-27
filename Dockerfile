# Sovereign Intelligence Platform
# Production Dockerfile - Multi-stage build

# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/next.config.js ./

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
