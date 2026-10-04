FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm globally
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Install Docker CLI and system utilities for container orchestration fallback
RUN apk add --no-cache docker-cli docker-cli-compose bash curl

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/templates ./templates

ENV NODE_ENV=production
ENV HOSTIFY_PORT=3500

EXPOSE 3500

CMD ["node", "dist/index.cjs"]
