#!/bin/bash
set -e

# Deploy Narrative Generation API to Google Cloud Run
# 
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Google Cloud project configured
#   - Billing enabled
#
# Usage:
#   ./scripts/deploy.sh

echo "======================================"
echo "Deploying Narrative API to Cloud Run"
echo "======================================"
echo ""

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No GCP project configured"
  echo "Run: gcloud config set project YOUR-PROJECT-ID"
  exit 1
fi

echo "Project: $PROJECT_ID"
echo "Region: us-central1"
echo ""

# Confirm deployment
read -p "Deploy to Cloud Run? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 0
fi

echo ""
echo "Deploying..."
echo ""

# Deploy to Cloud Run
gcloud run deploy narrative-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances=2 \
  --concurrency=2 \
  --memory=1Gi \
  --timeout=300s \
  --cpu=1 \
  --min-instances=0 \
  --set-env-vars GCP_PROJECT=${PROJECT_ID}

# Get the service URL
SERVICE_URL=$(gcloud run services describe narrative-api \
  --region us-central1 \
  --format 'value(status.url)' 2>/dev/null)

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "API URL: $SERVICE_URL"
echo ""
echo "Test endpoints:"
echo "  Health: curl $SERVICE_URL/health"
echo "  Scenarios: curl $SERVICE_URL/scenarios"
echo ""
echo "Generate narrative:"
echo "  curl -X POST $SERVICE_URL/generate \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"scenario\":\"insurance-underwriting\"}'"
echo ""
echo "Rate limits:"
echo "  - 20 requests per hour per user"
echo "  - 2 max instances (cost ceiling: ~\$46/month)"
echo "  - Scales to zero when idle"
echo ""
