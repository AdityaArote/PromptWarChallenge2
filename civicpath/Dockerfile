# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install serve for static hosting
RUN npm install -g serve@14

# Copy built assets only
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S civicpath && adduser -S civicpath -G civicpath
USER civicpath

EXPOSE 8080

# serve listens on $PORT which Cloud Run sets to 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
