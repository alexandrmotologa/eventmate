# Stage 1: Build Frontend (Vite + React)
FROM node:24-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Backend (Fastify + TypeScript)
FROM node:24-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

COPY --from=server-builder /app/server/dist ./dist
COPY --from=web-builder /app/web/dist ./public

EXPOSE 8080
VOLUME ["/app/server/data"]

CMD ["node", "dist/index.js"]
