FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Instalar docker CLI para fallback de comandos si fuera necesario
RUN apk add --no-cache docker-cli docker-cli-compose bash curl

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV HOSTIFY_PORT=3000

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
