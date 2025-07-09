# aiMMar Google Cloud Platform Deployment Guide

This guide walks through deploying the aiMMar application to Google Cloud Platform using Cloud Run (backend) and Firebase Hosting (frontend).

## Prerequisites

1. **Google Cloud Account**: Active GCP account with billing enabled
2. **Google Cloud SDK**: Install gcloud CLI tool
3. **Firebase CLI**: Install Firebase tools
4. **Node.js**: Version 18+ for frontend build
5. **Docker**: For local testing (optional)

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   Cloud Run     │    │    NeonDB       │
│   Hosting       │◄──►│   Backend API   │◄──►│   Database      │
│   (Frontend)    │    │   (FastAPI)     │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Step 1: GCP Project Setup

### 1.1 Create and Configure GCP Project

```bash
# Login to Google Cloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create aimmar-app --name="aiMMar Application"

# Set default project
gcloud config set project aimmar-app

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com
```

### 1.2 Set up Service Account

```bash
# Create service account for deployment
gcloud iam service-accounts create aimmar-service-account \
  --display-name="aiMMar Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding aimmar-app \
  --member="serviceAccount:aimmar-service-account@aimmar-app.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding aimmar-app \
  --member="serviceAccount:aimmar-service-account@aimmar-app.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 2: Environment Configuration

### 2.1 Set up Secret Manager

```bash
# Create secret for database URL
echo -n "postgresql://username:password@host:port/database" | \
  gcloud secrets create database-url --data-file=-

# Create secret for allowed origins (will be updated after Firebase setup)
echo -n "http://localhost:3000" | \
  gcloud secrets create allowed-origins --data-file=-

# Grant service account access to secrets
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:aimmar-service-account@aimmar-app.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding allowed-origins \
  --member="serviceAccount:aimmar-service-account@aimmar-app.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 3: Backend Deployment (Cloud Run)

### 3.1 Build and Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Build Docker image
gcloud builds submit --tag gcr.io/aimmar-app/aimmar-backend

# Deploy to Cloud Run
gcloud run deploy aimmar-backend \
  --image gcr.io/aimmar-app/aimmar-backend \
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
  --service-account aimmar-service-account@aimmar-app.iam.gserviceaccount.com \
  --set-env-vars PORT=8080 \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest

# Get the service URL
gcloud run services describe aimmar-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

### 3.2 Test Backend Deployment

```bash
# Test health endpoint
curl https://YOUR-CLOUD-RUN-URL/api/health

# Expected response:
# {"status":"healthy","service":"aiMMar Backend","version":"2.0.0"}
```

## Step 4: Frontend Deployment (Firebase)

### 4.1 Initialize Firebase

```bash
# Navigate to project root
cd ..

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init hosting

# Select existing project: aimmar-app
# Set public directory: out
# Configure as single-page app: Yes
# Set up automatic builds with GitHub: No (for now)
```

### 4.2 Configure Frontend for GCP

Update the environment configuration to point to your Cloud Run backend:

```bash
# Create production environment file
cat > .env.production << EOF
NEXT_PUBLIC_BACKEND_URL=https://YOUR-CLOUD-RUN-URL
EOF
```

### 4.3 Update CORS Configuration

```bash
# Update allowed origins to include Firebase domain
FIREBASE_URL=$(firebase hosting:channel:open preview --json | jq -r '.url')

# Update the secret with Firebase URL
echo -n "http://localhost:3000,${FIREBASE_URL}" | \
  gcloud secrets versions add allowed-origins --data-file=-

# Redeploy backend with updated CORS
gcloud run deploy aimmar-backend \
  --image gcr.io/aimmar-app/aimmar-backend \
  --platform managed \
  --region us-central1
```

### 4.4 Build and Deploy Frontend

```bash
# Build the frontend
npm run build:firebase

# Deploy to Firebase
firebase deploy --only hosting

# Get the hosting URL
firebase hosting:channel:open live
```

## Step 5: Domain Configuration (Optional)

### 5.1 Custom Domain for Firebase

```bash
# Add custom domain to Firebase
firebase hosting:sites:create your-domain.com

# Follow Firebase console instructions to:
# 1. Add domain verification
# 2. Configure DNS records
# 3. Enable SSL certificates
```

### 5.2 Custom Domain for Cloud Run

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service aimmar-backend \
  --domain api.your-domain.com \
  --region us-central1
```

## Step 6: CI/CD Pipeline (Optional)

### 6.1 GitHub Actions for Automated Deployment

Create `.github/workflows/gcp-deploy.yml`:

```yaml
name: Deploy to GCP
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: aimmar-app
      - name: Deploy Backend
        run: |
          cd backend
          gcloud builds submit --tag gcr.io/aimmar-app/aimmar-backend
          gcloud run deploy aimmar-backend --image gcr.io/aimmar-app/aimmar-backend --region us-central1

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:firebase
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: aimmar-app
```

## Step 7: Monitoring and Logging

### 7.1 Enable Cloud Monitoring

```bash
# Enable monitoring APIs
gcloud services enable monitoring.googleapis.com logging.googleapis.com

# Create alerting policies (optional)
gcloud alpha monitoring policies create --policy-from-file=monitoring-policy.yaml
```

### 7.2 View Logs

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aimmar-backend" --limit 50

# View Firebase hosting logs in Firebase console
```

## Cost Optimization

### Current Estimated Costs (US-Central1):
- **Cloud Run**: $0.00 (within free tier for small traffic)
- **Firebase Hosting**: $0.00 (within free tier: 10GB storage, 360MB/day transfer)
- **Secret Manager**: ~$0.06/month (2 secrets)
- **Container Registry**: ~$0.10/month (minimal storage)

**Total estimated monthly cost: ~$0.16/month** (excluding database costs)

### Cost Optimization Tips:
1. **Use Cloud Run min-instances=0** for automatic scaling to zero
2. **Firebase Hosting free tier** covers most small applications
3. **Keep NeonDB external** to avoid Cloud SQL costs (~$7/month minimum)
4. **Use Cloud Build free tier** (120 build-minutes/day free)

## Troubleshooting

### Common Issues:

1. **Health check failing**: Ensure `/api/health` endpoint returns 200 status
2. **CORS errors**: Update `allowed-origins` secret with correct Firebase URL
3. **Build failures**: Check Cloud Build logs for dependency issues
4. **Database connection**: Verify NeonDB connection string in Secret Manager

### Debug Commands:

```bash
# Check Cloud Run service status
gcloud run services describe aimmar-backend --region us-central1

# View recent logs
gcloud logs tail "projects/aimmar-app/logs/run.googleapis.com%2Fstdout"

# Test local Docker build
cd backend && docker build -t aimmar-backend . && docker run -p 8080:8080 aimmar-backend
```

## Security Considerations

1. **Service Account**: Uses least-privilege access
2. **Secrets**: Environment variables stored in Secret Manager
3. **HTTPS**: Automatic SSL for both Firebase and Cloud Run
4. **CORS**: Restricted to specific origins
5. **Authentication**: Cloud Run allows unauthenticated for API access (can be restricted if needed)

## Next Steps

1. **Custom Domain**: Configure custom domains for production
2. **Monitoring**: Set up alerting and monitoring dashboards
3. **Backup**: Implement database backup strategy
4. **Performance**: Monitor and optimize Cloud Run resource allocation
5. **Security**: Implement authentication/authorization if needed 