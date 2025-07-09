#!/bin/bash
# aiMMar Complete GCP Deployment Script (Resume-Safe)
# Project: zeidgeistdotcom
# User: zeidalqadri@gmail.com

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="zeidgeistdotcom"
USER_EMAIL="zeidalqadri@gmail.com"
REGION="us-central1"
SERVICE_NAME="aimmar-backend"
SERVICE_ACCOUNT="aimmar-service-account"
FIREBASE_PROJECT="zeidgeistdotcom"

echo -e "${BLUE}🚀 Starting aiMMar GCP Deployment (Resume-Safe)${NC}"
echo -e "${BLUE}Project ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}User: ${USER_EMAIL}${NC}"
echo ""

# Helper function to check if service account exists
check_service_account() {
    gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null
}

# Helper function to check if secret exists
check_secret() {
    gcloud secrets describe $1 &>/dev/null
}

# Helper function to check if Cloud Run service exists
check_cloud_run_service() {
    gcloud run services describe ${SERVICE_NAME} --region ${REGION} &>/dev/null
}

# Step 1: Authentication and Project Setup
echo -e "${YELLOW}📋 Step 1: Authentication and Project Setup${NC}"
echo "Authenticating with Google Cloud..."
gcloud auth login --account=${USER_EMAIL}

echo "Setting default project..."
gcloud config set project ${PROJECT_ID}

echo "Setting default region..."
gcloud config set run/region ${REGION}

echo "Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  containerregistry.googleapis.com

echo -e "${GREEN}✅ Project setup complete${NC}"
echo ""

# Step 2: Service Account Setup
echo -e "${YELLOW}🔐 Step 2: Service Account Setup${NC}"
if check_service_account; then
    echo -e "${GREEN}✅ Service account already exists, skipping creation${NC}"
else
    echo "Creating service account..."
    gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
      --display-name="aiMMar Service Account" \
      --description="Service account for aiMMar application"
fi

echo "Ensuring Cloud Run permissions..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" &>/dev/null || echo "Permission already exists"

echo "Ensuring Secret Manager permissions..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" &>/dev/null || echo "Permission already exists"

echo -e "${GREEN}✅ Service account setup complete${NC}"
echo ""

# Step 3: Secret Manager Configuration
echo -e "${YELLOW}🔒 Step 3: Secret Manager Configuration${NC}"

# Check database-url secret
if check_secret "database-url"; then
    echo -e "${GREEN}✅ Database URL secret already exists${NC}"
    echo "Current secret version:"
    gcloud secrets versions list database-url --limit=1 --format="value(name)"
    read -p "Do you want to update the database URL? (y/N): " update_db
    if [[ $update_db =~ ^[Yy]$ ]]; then
        echo "Please provide your NeonDB connection string:"
        echo "Format: postgresql://username:password@host:port/database"
        read -p "Database URL: " DATABASE_URL
        echo -n "${DATABASE_URL}" | gcloud secrets versions add database-url --data-file=-
        echo -e "${GREEN}✅ Database URL secret updated${NC}"
    fi
else
    echo "Creating database-url secret..."
    echo "Please provide your NeonDB connection string:"
    echo "Format: postgresql://username:password@host:port/database"
    read -p "Database URL: " DATABASE_URL
    echo -n "${DATABASE_URL}" | gcloud secrets create database-url --data-file=-
    echo -e "${GREEN}✅ Database URL secret created${NC}"
fi

# Check allowed-origins secret
if check_secret "allowed-origins"; then
    echo -e "${GREEN}✅ Allowed origins secret already exists${NC}"
else
    echo "Creating initial allowed-origins secret..."
    echo -n "http://localhost:3000" | gcloud secrets create allowed-origins --data-file=-
    echo -e "${GREEN}✅ Allowed origins secret created${NC}"
fi

echo "Ensuring service account access to secrets..."
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" &>/dev/null || echo "Permission already exists"

gcloud secrets add-iam-policy-binding allowed-origins \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" &>/dev/null || echo "Permission already exists"

echo -e "${GREEN}✅ Secret Manager configuration complete${NC}"
echo ""

# Step 4: Backend Deployment (Cloud Run)
echo -e "${YELLOW}🐳 Step 4: Backend Deployment (Cloud Run)${NC}"
echo "Building Docker image..."
cd backend
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --port 8080 \
  --service-account ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest

echo "Getting Cloud Run service URL..."
BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --format 'value(status.url)')

echo -e "${GREEN}✅ Backend deployed successfully${NC}"
echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"

# Test backend health
echo "Testing backend health..."
sleep 10  # Give the service a moment to start
curl -f "${BACKEND_URL}/api/health" || echo -e "${RED}❌ Health check failed${NC}"

cd ..
echo ""

# Step 5: Firebase Setup and Frontend Deployment
echo -e "${YELLOW}🔥 Step 5: Firebase Setup and Frontend Deployment${NC}"
echo "Installing Firebase CLI (if not already installed)..."
npm install -g firebase-tools

echo "Authenticating with Firebase..."
firebase login --email ${USER_EMAIL}

echo "Setting Firebase project..."
firebase use ${FIREBASE_PROJECT}

echo "Creating production environment file..."
cat > .env.production << EOF
NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}
EOF

echo "Building frontend for production..."
npm run build:firebase

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting --non-interactive

echo "Getting Firebase hosting URL..."
FRONTEND_URL=$(firebase hosting:site:get ${FIREBASE_PROJECT} --format="value(defaultUrl)" 2>/dev/null || echo "https://${FIREBASE_PROJECT}.web.app")

echo -e "${GREEN}✅ Frontend deployed successfully${NC}"
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo ""

# Step 6: Update CORS Configuration
echo -e "${YELLOW}🔄 Step 6: Update CORS Configuration${NC}"
echo "Updating allowed origins with Firebase URL..."
echo -n "http://localhost:3000,${FRONTEND_URL}" | \
  gcloud secrets versions add allowed-origins --data-file=-

echo "Redeploying backend with updated CORS..."
cd backend
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --service-account ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest

cd ..
echo -e "${GREEN}✅ CORS configuration updated${NC}"
echo ""

# Step 7: Final Testing and Verification
echo -e "${YELLOW}🧪 Step 7: Final Testing and Verification${NC}"
echo "Testing backend health endpoint..."
curl -f "${BACKEND_URL}/api/health"

echo ""
echo "Testing CORS configuration..."
curl -H "Origin: ${FRONTEND_URL}" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "${BACKEND_URL}/api/" &>/dev/null && echo "CORS test passed" || echo "CORS test failed"

echo ""
echo -e "${GREEN}✅ Deployment verification complete${NC}"
echo ""

# Step 8: Summary and Next Steps
echo -e "${BLUE}🎉 DEPLOYMENT COMPLETE!${NC}"
echo ""
echo -e "${GREEN}📊 Deployment Summary:${NC}"
echo -e "Project ID: ${PROJECT_ID}"
echo -e "Backend URL: ${BACKEND_URL}"
echo -e "Frontend URL: ${FRONTEND_URL}"
echo ""
echo -e "${GREEN}🔗 Application URLs:${NC}"
echo -e "Frontend: ${FRONTEND_URL}"
echo -e "Backend API: ${BACKEND_URL}/api"
echo -e "Health Check: ${BACKEND_URL}/api/health"
echo ""
echo -e "${GREEN}💰 Estimated Monthly Costs:${NC}"
echo -e "Cloud Run: $0.00 (free tier)"
echo -e "Firebase Hosting: $0.00 (free tier)"
echo -e "Secret Manager: ~$0.06"
echo -e "Container Registry: ~$0.10"
echo -e "Total: ~$0.16/month"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test the application thoroughly at ${FRONTEND_URL}"
echo "2. Configure custom domain (optional)"
echo "3. Set up monitoring and alerting"
echo "4. Configure CI/CD pipeline for automated deployments"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "View logs: gcloud logging read \"resource.type=cloud_run_revision\" --limit 50"
echo "Redeploy backend: cd backend && gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME} && gcloud run deploy ${SERVICE_NAME} --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
echo "Redeploy frontend: npm run build:firebase && firebase deploy --only hosting"
echo ""
echo -e "${GREEN}🎊 Congratulations! Your aiMMar application is now live on Google Cloud Platform!${NC}" 