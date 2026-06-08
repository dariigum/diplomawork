FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
ENV NODE_ENV=development
# lockfile from macOS + npm ci skips Linux optional natives (npm/cli#4828)
RUN npm install --include=dev --include=optional && \
    npm install --no-save \
      @tailwindcss/oxide-linux-x64-gnu@$(node -p "require('@tailwindcss/oxide/package.json').version") \
      lightningcss-linux-x64-gnu@$(node -p "require('lightningcss/package.json').version") && \
    node -e "require('@tailwindcss/oxide'); require('lightningcss')"

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN mkdir -p data/chat-uploads public/uploads/resumes

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/hooks ./hooks
COPY --from=builder /app/proxy.ts ./proxy.ts
COPY --from=builder /app/data ./data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
