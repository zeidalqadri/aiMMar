# Deployment Guide for aiMMar on Cloudflare

## Overview
This guide covers the deployment setup for aiMMar with Cloudflare Pages (frontend) and a separate backend service.

## Frontend Deployment (Cloudflare Pages)

### 1. Cloudflare Pages Configuration
Your repository is already set up for auto-deployment. Ensure these settings in your Cloudflare Pages dashboard:

**Build Settings:**
- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output directory: `.next`
- Root directory: `/` (project root)

**Environment Variables (Required):**
Add these in Cloudflare Pages dashboard under Settings > Environment Variables:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

### 2. Node.js Version
Ensure Cloudflare Pages uses Node.js 18+ by adding this to your `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Backend Deployment Options

### Option 1: Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables:
   - `DATABASE_URL`: Your NeonDB connection string
   - `PORT`: 8000
   - `HOST`: 0.0.0.0
   - `ALLOWED_ORIGINS`: Include your Cloudflare Pages domain

### Option 2: Render
1. Connect repository to Render
2. Use Python environment
3. Build command: `cd backend && pip install -r requirements.txt`
4. Start command: `cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT`

### Option 3: Heroku
1. Create `Procfile` in backend directory:
   ```
   web: python -m uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
2. Set environment variables in Heroku dashboard

## Required Environment Variables

### Backend (.env - DO NOT COMMIT)
```
DATABASE_URL=postgresql+asyncpg://username:password@host/database?ssl=require
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000,https://your-cloudflare-domain.pages.dev,https://aimmar.zeidgeist.com
```

### Frontend (Cloudflare Pages Environment Variables)
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

## Deployment Checklist

### Before Deploying:
- [ ] Update `NEXT_PUBLIC_BACKEND_URL` in Cloudflare Pages environment variables
- [ ] Update `ALLOWED_ORIGINS` in backend environment to include your Cloudflare domain
- [ ] Ensure NeonDB is accessible from your backend hosting service
- [ ] Test backend endpoints locally

### After Deploying:
- [ ] Verify frontend builds successfully on Cloudflare Pages
- [ ] Test backend API endpoints
- [ ] Verify database connection and table creation
- [ ] Test frontend-backend communication
- [ ] Check CORS configuration

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure your Cloudflare domain is in `ALLOWED_ORIGINS`
2. **Database Connection**: Verify NeonDB connection string format for asyncpg
3. **Build Failures**: Check Node.js version and dependencies
4. **API Calls Failing**: Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly

### Debug Steps:
1. Check Cloudflare Pages build logs
2. Monitor backend service logs
3. Use browser dev tools to inspect network requests
4. Verify environment variables are set correctly

## Security Notes
- Never commit `.env` files with real credentials
- Use environment variables for all sensitive data
- Ensure HTTPS is enabled for production
- Regularly rotate database credentials