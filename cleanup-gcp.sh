#!/bin/bash
# aiMMar GCP Cleanup Script
# Use this to clean up existing resources if you need to start fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="zeidgeistdotcom"
REGION="us-central1"
SERVICE_NAME="aimmar-backend"
SERVICE_ACCOUNT="aimmar-service-account"

echo -e "${RED}⚠️  GCP Resource Cleanup Script${NC}"
echo -e "${RED}This will delete existing aiMMar resources in project: ${PROJECT_ID}${NC}"
echo ""
echo "Resources that will be deleted:"
echo "- Cloud Run service: ${SERVICE_NAME}"
echo "- Service Account: ${SERVICE_ACCOUNT}"
echo "- Secrets: database-url, allowed-origins"
echo "- Container images in Container Registry"
echo ""
read -p "Are you sure you want to proceed? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo -e "${YELLOW}🧹 Starting cleanup...${NC}"

# Set project
gcloud config set project ${PROJECT_ID}

# Delete Cloud Run service
echo "Deleting Cloud Run service..."
gcloud run services delete ${SERVICE_NAME} --region ${REGION} --quiet || echo "Service not found or already deleted"

# Delete secrets
echo "Deleting secrets..."
gcloud secrets delete database-url --quiet || echo "Secret not found or already deleted"
gcloud secrets delete allowed-origins --quiet || echo "Secret not found or already deleted"

# Delete service account
echo "Deleting service account..."
gcloud iam service-accounts delete ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com --quiet || echo "Service account not found or already deleted"

# Delete container images
echo "Deleting container images..."
gcloud container images delete gcr.io/${PROJECT_ID}/${SERVICE_NAME} --force-delete-tags --quiet || echo "Images not found or already deleted"

echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "You can now run the deployment script fresh:"
echo "./deploy-gcp-resume.sh" 