# Marketing-only: docker build -t b2bfintech-ui .
# With workspace: docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com -t b2bfintech-ui .
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN useradd --create-home --shell /bin/false appuser

# Next.js "standalone" output (next.config.ts) - a minimal server bundle with only the
# dependencies actually used, no full node_modules copy needed.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER appuser
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
