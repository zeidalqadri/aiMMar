# Manual GCP Deployment Commands

## Prerequisites
Ensure you have:
- Google Cloud SDK installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Docker installed (for local testing)

## Step 1: Authentication and Project Setup

```bash
# Login to Google Cloud
gcloud auth login --account=zeidalqadri@gmail.com

# Set project
gcloud config set project zeidgeistdotcom

# Set default region
gcloud config set run/region us-central1

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  containerregistry.googleapis.com
```

## Step 2: Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create aimmar-service-account \
  --display-name="aiMMar Service Account" \
  --description="Service account for aiMMar application"

# Grant Cloud Run permissions
gcloud projects add-iam-policy-binding zeidgeistdotcom \
  --member="serviceAccount:aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Grant Secret Manager permissions
gcloud projects add-iam-policy-binding zeidgeistdotcom \
  --member="serviceAccount:aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 3: Secret Manager Configuration

```bash
# Create database URL secret (replace with your actual NeonDB URL)
echo -n "postgresql://username:password@host:port/database" | \
  gcloud secrets create database-url --data-file=-

# Create initial allowed origins secret
echo -n "http://localhost:3000" | \
  gcloud secrets create allowed-origins --data-file=-

# Grant service account access to secrets
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding allowed-origins \
  --member="serviceAccount:aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Backend Deployment (Cloud Run)

```bash
# Navigate to backend directory
cd backend

# Build Docker image
gcloud builds submit --tag gcr.io/zeidgeistdotcom/aimmar-backend

# Deploy to Cloud Run
gcloud run deploy aimmar-backend \
  --image gcr.io/zeidgeistdotcom/aimmar-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --port 8080 \
  --service-account aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com \
  --set-env-vars PORT=8080 \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest

# Get the service URL (save this for later)
gcloud run services describe aimmar-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'

# Test health endpoint (replace URL with actual from above)
curl https://YOUR-CLOUD-RUN-URL/api/health

# Return to project root
cd ..
```

## Step 5: Firebase Setup and Frontend Deployment

```bash
# Login to Firebase
firebase login --email zeidalqadri@gmail.com

# Set Firebase project
firebase use zeidgeistdotcom

# Create production environment file (replace with actual Cloud Run URL)
cat > .env.production << EOF
NEXT_PUBLIC_BACKEND_URL=https://YOUR-CLOUD-RUN-URL
EOF

# Build frontend
npm run build:firebase

# Deploy to Firebase Hosting
firebase deploy --only hosting --non-interactive

# Get hosting URL (save this for later)
firebase hosting:site:get zeidgeistdotcom
```

## Step 6: Update CORS Configuration

```bash
# Update allowed origins with Firebase URL (replace with actual Firebase URL)
echo -n "http://localhost:3000,https://YOUR-FIREBASE-URL" | \
  gcloud secrets versions add allowed-origins --data-file=-

# Redeploy backend with updated CORS
cd backend
gcloud run deploy aimmar-backend \
  --image gcr.io/zeidgeistdotcom/aimmar-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account aimmar-service-account@zeidgeistdotcom.iam.gserviceaccount.com \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest

cd ..
```

## Step 7: Testing and Verification

```bash
# Test backend health (replace with actual URLs)
curl https://YOUR-CLOUD-RUN-URL/api/health

# Test CORS configuration
curl -H "Origin: https://YOUR-FIREBASE-URL" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "https://YOUR-CLOUD-RUN-URL/api/"

# View logs if needed
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aimmar-backend" --limit 10
```

## Troubleshooting Commands

```bash
# View Cloud Run service details
gcloud run services describe aimmar-backend --region us-central1

# View recent logs
gcloud logs tail "projects/zeidgeistdotcom/logs/run.googleapis.com%2Fstdout"

# List secrets
gcloud secrets list

# View secret versions
gcloud secrets versions list database-url
gcloud secrets versions list allowed-origins

# Test local Docker build
cd backend
docker build -t aimmar-backend .
docker run -p 8080:8080 --env-file .env aimmar-backend
```

## Redeployment Commands

```bash
# Redeploy backend after code changes
cd backend
gcloud builds submit --tag gcr.io/zeidgeistdotcom/aimmar-backend
gcloud run deploy aimmar-backend --image gcr.io/zeidgeistdotcom/aimmar-backend --region us-central1
cd ..

# Redeploy frontend after code changes
npm run build:firebase
firebase deploy --only hosting
```

## Important Notes

1. **Database URL**: Replace `postgresql://username:password@host:port/database` with your actual NeonDB connection string
2. **URLs**: Replace `YOUR-CLOUD-RUN-URL` and `YOUR-FIREBASE-URL` with actual URLs from deployment outputs
3. **Project ID**: Commands use `zeidgeistdotcom` as specified
4. **Region**: All services deployed to `us-central1`
5. **Billing**: Ensure billing is enabled on your GCP project 