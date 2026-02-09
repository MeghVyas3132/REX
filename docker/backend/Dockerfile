# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev
WORKDIR /app

# Copy package files for backend
COPY backend/package*.json ./

# Copy prisma schema
COPY backend/prisma ./prisma/

# Skip puppeteer download (we'll use system chromium if needed)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies (use npm install since lock file may be out of sync)
RUN npm install && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM base AS runner
WORKDIR /app

# Install python3 and build tools for native modules, plus chromium for puppeteer
RUN apk add --no-cache python3 make g++ chromium openssl openssl-dev wget

# Set puppeteer to use installed chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy backend source code
COPY backend/ ./

# Copy shared packages for runtime TypeScript resolution (must be at same relative path as tsconfig expects)
COPY shared/ /shared/
COPY nodes/ /nodes/
COPY engine/ /engine/

# Install dependencies for nodes package
RUN cd /nodes && npm install --omit=dev

# Symlink @prisma/client into nodes so database node can resolve it
RUN mkdir -p /nodes/node_modules/@prisma && \
    ln -sf /app/node_modules/@prisma/client /nodes/node_modules/@prisma/client && \
    mkdir -p /nodes/node_modules/.prisma && \
    ln -sf /app/node_modules/.prisma/client /nodes/node_modules/.prisma/client

# Create symlinks to make @rex/* imports work
RUN mkdir -p node_modules/@rex && \
    ln -sf /shared node_modules/@rex/shared && \
    ln -sf /nodes node_modules/@rex/nodes && \
    ln -sf /engine node_modules/@rex/engine

# Re-generate Prisma client in runner
RUN npx prisma generate

# Create logs and uploads directories
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Health check - use root endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/ || exit 1

# Start the application using server.js which loads ts-node
CMD ["node", "server.js"]
