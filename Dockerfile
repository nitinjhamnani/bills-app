# Marketing-only: docker build -t paytrix .
# With workspace login: docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com -t paytrix .
#
# DigitalOcean App Platform passes build-time env vars as --build-arg.
# NEXT_PUBLIC_* values are inlined by Next.js during `npm run build`, so the API
# origin must be present at build time, not only when the container starts.
FROM node:20-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone server.js binds to the machine hostname unless this is all interfaces.
ENV HOSTNAME=0.0.0.0
# App Platform's HTTP port for this image. Do not set a different PORT in the dashboard.
ENV PORT=8080

RUN useradd --create-home --shell /bin/false appuser

COPY --from=build --chown=appuser:appuser /app/.next/standalone ./
COPY --from=build --chown=appuser:appuser /app/.next/static ./.next/static
COPY --from=build --chown=appuser:appuser /app/public ./public

USER appuser
EXPOSE 8080
CMD ["node", "server.js"]
