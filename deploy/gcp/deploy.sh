#!/usr/bin/env bash
# Phase 5 deployment scaffolding - deploys b2bfintech-ui to Cloud Run.
# Not run automatically here - requires a real GCP project and `gcloud auth login` first.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your GCP project id}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-b2bfintech-ui}"
# Marketing-only: leave API_BASE_URL unset so the image has no backend origin.
# Workspace: set to the deployed api-app's public URL, e.g. https://b2bfintech-api-xyz.a.run.app
API_BASE_URL="${API_BASE_URL:-}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/b2bfintech/${SERVICE_NAME}:$(git rev-parse --short HEAD)"

# Uses cloudbuild.yaml (not a plain --tag build) so the NEXT_PUBLIC_API_BASE_URL build arg
# actually reaches `docker build` - Next.js bakes NEXT_PUBLIC_* vars in at build time.
gcloud builds submit --project "$PROJECT_ID" --config deploy/gcp/cloudbuild.yaml \
  --substitutions "_IMAGE=${IMAGE},_NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}" ..

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated \
  --port 3000
