#!/usr/bin/env bash
# =============================================================================
# deploy-gcp.sh — Deploy ElectIQ to Google Cloud Run
# Project: promptchallenge2 | Region: us-central1
# Usage:  bash deploy-gcp.sh
# =============================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID="promptchallenge2"
REGION="us-central1"
REGISTRY="gcr.io"

BACKEND_SERVICE="electiq-backend"
FRONTEND_SERVICE="electiq-frontend"

BACKEND_IMAGE="$REGISTRY/$PROJECT_ID/$BACKEND_SERVICE"
FRONTEND_IMAGE="$REGISTRY/$PROJECT_ID/$FRONTEND_SERVICE"

SA_EMAIL="promptwarchallenge2@promptchallenge2.iam.gserviceaccount.com"

# ── Load env vars ─────────────────────────────────────────────────────────────
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "==> Authenticating with GCP..."
gcloud config set project $PROJECT_ID

echo "==> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project=$PROJECT_ID

# ── Store credentials in Secret Manager ───────────────────────────────────────
echo "==> Uploading service account key to Secret Manager..."
gcloud secrets create gcp-service-account-key \
  --replication-policy="automatic" \
  --project=$PROJECT_ID 2>/dev/null || echo "Secret already exists, updating..."

gcloud secrets versions add gcp-service-account-key \
  --data-file=credentials/service-account.json \
  --project=$PROJECT_ID

# Grant the service account access to its own secret
gcloud secrets add-iam-policy-binding gcp-service-account-key \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

# ── Build & Push Backend ──────────────────────────────────────────────────────
echo ""
echo "==> Building backend Docker image..."
gcloud builds submit ./backend \
  --tag=$BACKEND_IMAGE \
  --project=$PROJECT_ID

echo "==> Deploying backend to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
  --image=$BACKEND_IMAGE \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --service-account=$SA_EMAIL \
  --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,VERTEX_AI_PROJECT=$VERTEX_AI_PROJECT,VERTEX_AI_LOCATION=$VERTEX_AI_LOCATION,GOOGLE_MAPS_SERVER_KEY=$GOOGLE_MAPS_SERVER_KEY" \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=gcp-service-account-key:latest" \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8080 \
  --project=$PROJECT_ID

# ── Get Backend URL ───────────────────────────────────────────────────────────
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --platform=managed \
  --region=$REGION \
  --format="value(status.url)" \
  --project=$PROJECT_ID)

echo "Backend deployed at: $BACKEND_URL"

# ── Build & Push Frontend ─────────────────────────────────────────────────────
echo ""
echo "==> Building frontend Docker image (with backend URL injected)..."
gcloud builds submit ./frontend \
  --tag=$FRONTEND_IMAGE \
  --substitutions="_VITE_API_BASE_URL=$BACKEND_URL,_VITE_SUPABASE_URL=$VITE_SUPABASE_URL,_VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY,_VITE_MAPS_API_KEY=$VITE_MAPS_API_KEY" \
  --project=$PROJECT_ID

echo "==> Deploying frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
  --image=$FRONTEND_IMAGE \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8080 \
  --project=$PROJECT_ID

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --platform=managed \
  --region=$REGION \
  --format="value(status.url)" \
  --project=$PROJECT_ID)

echo ""
echo "============================================================"
echo "  ElectIQ Deployment Complete!"
echo "============================================================"
echo "  Frontend : $FRONTEND_URL"
echo "  Backend  : $BACKEND_URL"
echo "  API Docs : $BACKEND_URL/docs"
echo "============================================================"
