# Production image — Next.js standalone (see landing/next.config.ts).
# Build args bake NEXT_PUBLIC_* at compile time; rebuild the image after changing them.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.global-it-ss.com \
#     --build-arg NEXT_PUBLIC_APP_URL=https://app.global-it-ss.com \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.global-it-ss.com \
#     -t gsms-landing:latest landing/

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_URL=http://localhost
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
