# 🚀 aiMMar Hybrid Deployment Guide

## 📋 **Architecture Overview**

**Hybrid Cloud Deployment Strategy:**
- 🌐 **Frontend**: Cloudflare Pages (fast global CDN, free tier)
- ⚙️ **Backend**: GCP Cloud Run (serverless, auto-scaling)
- 🗄️ **Database**: NeonDB (external, free tier)

**Benefits:**
- ✅ Best performance (Cloudflare's global CDN)
- ✅ Cost optimization (~$0.16/month total)
- ✅ No authentication barriers (unlike Vercel)
- ✅ Auto-scaling backend
- ✅ Simple deployment process

---

## 🎯 **Part 1: Frontend Deployment (Cloudflare Pages)**

### **Prerequisites:**
- GitHub repository with your aiMMar code
- Cloudflare account (free)

### **Step 1: Connect Repository to Cloudflare Pages**

1. **Go to Cloudflare Dashboard**
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Pages** in the sidebar

2. **Create New Project**
   - Click "**Create a project**"
   - Select "**Connect to Git**"
   - Choose your GitHub repository: `zeidalqadri/aiMMar`

3. **Configure Build Settings**
   ```
   Framework preset: Next.js (Static HTML Export)
   Build command: npm run build
   Build output directory: out
   Root directory: (leave empty)
   ```

4. **Set Environment Variables**
   ```
   NODE_VERSION = 20
   NEXT_PUBLIC_BACKEND_URL = https://your-backend-url (set after backend deployment)
   ```

5. **Deploy**
   - Click "**Save and Deploy**"
   - Your frontend will be live at: `https://aimmar-xyz.pages.dev`

---

## ⚙️ **Part 2: Backend Deployment (GCP Cloud Run)**

### **Prerequisites:**
- Google Cloud account
- gcloud CLI installed [[memory:2710948]]

### **Step 1: GCP Project Setup**

```bash
# Authenticate with Google Cloud
gcloud auth login --account=zeidalqadri@gmail.com

# Set project
gcloud config set project zeidgeistdotcom

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com
```

### **Step 2: Create Secrets**

```bash
# Create database URL secret
echo -n "your-neondb-connection-string" | gcloud secrets create database-url --data-file=-

# Create CORS origins secret (update with your Cloudflare domain)
echo -n "http://localhost:3000,https://aimmar-xyz.pages.dev" | gcloud secrets create allowed-origins --data-file=-
```

### **Step 3: Deploy Backend**

```bash
# Navigate to backend directory
cd backend

# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/zeidgeistdotcom/aimmar-backend

gcloud run deploy aimmar-backend \
  --image gcr.io/zeidgeistdotcom/aimmar-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest
```

### **Step 4: Get Backend URL**

```bash
# Get the backend service URL
gcloud run services describe aimmar-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

---

## 🔗 **Part 3: Connect Frontend to Backend**

### **Update Cloudflare Environment Variables**

1. **Go to Cloudflare Pages Dashboard**
   - Select your aiMMar project
   - Go to **Settings** → **Environment variables**

2. **Update Backend URL**
   ```
   NEXT_PUBLIC_BACKEND_URL = https://your-actual-backend-url-from-step-4
   ```

3. **Redeploy Frontend**
   - Go to **Deployments** tab
   - Click "**Retry deployment**" or push a new commit

### **Update Backend CORS**

```bash
# Update allowed origins with your actual Cloudflare domain
echo -n "http://localhost:3000,https://your-actual-cloudflare-domain.pages.dev" | \
  gcloud secrets versions add allowed-origins --data-file=-

# Redeploy backend to pick up new CORS settings
gcloud run deploy aimmar-backend \
  --image gcr.io/zeidgeistdotcom/aimmar-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets DATABASE_URL=database-url:latest,ALLOWED_ORIGINS=allowed-origins:latest
```

---

## ✅ **Part 4: Verification & Testing**

### **Test Backend Health**
```bash
curl https://your-backend-url/api/health
# Should return: {"status": "healthy", "service": "aiMMar API"}
```

### **Test Frontend**
1. Visit your Cloudflare Pages URL
2. Create a new session
3. Send a test message to verify backend communication

### **Test CORS**
```bash
curl -H "Origin: https://your-cloudflare-domain.pages.dev" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-backend-url/api/
```

---

## 📊 **Cost Breakdown**

**Monthly Costs:**
- 🌐 **Cloudflare Pages**: $0.00 (free tier)
- ⚙️ **GCP Cloud Run**: $0.00 (free tier covers usage)
- 🔒 **GCP Secret Manager**: ~$0.06
- 📦 **GCP Container Registry**: ~$0.10
- 🗄️ **NeonDB**: $0.00 (free tier)

**Total: ~$0.16/month** 🎉

---

## 🔧 **Useful Commands**

### **Redeploy Backend:**
```bash
cd backend
gcloud builds submit --tag gcr.io/zeidgeistdotcom/aimmar-backend
gcloud run deploy aimmar-backend --image gcr.io/zeidgeistdotcom/aimmar-backend
```

### **View Backend Logs:**
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

### **Redeploy Frontend:**
```bash
# Just push to GitHub - Cloudflare auto-deploys
git push origin main
```

---

## 🎉 **Success!**

Your aiMMar application is now running on:
- **Frontend**: `https://your-project.pages.dev` (Cloudflare)
- **Backend**: `https://your-backend.a.run.app` (GCP Cloud Run)
- **Database**: NeonDB (external)

This hybrid approach gives you the best of both worlds: Cloudflare's lightning-fast global CDN for your frontend and GCP's powerful serverless infrastructure for your backend! 