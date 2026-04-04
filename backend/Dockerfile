FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# deps stage has no generated Prisma client; builder runs `prisma generate` during `nest build`.
# Without this, enums like ChannelType are undefined at runtime.
RUN npx prisma generate

EXPOSE 4321

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]