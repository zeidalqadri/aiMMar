# aiMMar Monorepo Deployment Guide

This guide outlines how to deploy the aiMMar application with its frontend (Next.js) and backend (FastAPI) components using a monorepo approach.

## Project Structure

The current structure is:

```
aimmar/
├── app/                # Next.js app directory
├── components/         # React components
├── backend/            # FastAPI backend
├── services/           # Frontend services
└── ...other files
```

## Deployment Strategy

We'll use a hybrid deployment approach:

1. **Frontend**: Deploy to Cloudflare Pages
2. **Backend**: Deploy to a platform that supports Python (Railway, Render, or Heroku)

## Frontend Deployment (Cloudflare Pages)

1. **Build Configuration**:
   - The `wrangler.toml` file is now configured correctly with `pages_build_output_dir = "out"`.
   - The `next.config.js` file is set up for static export with `output: 'export'`.

2. **Deployment Commands**:
   ```bash
   # Build and deploy frontend
   npm run build:cf
   ```

3. **Environment Variables**:
   - Set `NEXT_PUBLIC_BACKEND_URL` in the Cloudflare Pages dashboard to point to your backend URL.

## Backend Deployment

### Option 1: Railway (Recommended)

1. Create a new Railway project linked to your GitHub repository.
2. Configure the service to use the `backend/` directory.
3. Add these environment variables:
   - `DATABASE_URL`: Your NeonDB connection string
   - `PORT`: 8000
   - `HOST`: 0.0.0.0
   - `ALLOWED_ORIGINS`: Include your Cloudflare Pages domain

### Option 2: Render

1. Create a new Web Service linked to your repository.
2. Set the root directory to `backend/`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add the required environment variables.

### Option 3: Heroku

1. Create a `Procfile` in the `backend/` directory:
   ```
   web: cd backend && uvicorn server:app --host=0.0.0.0 --port=$PORT
   ```
2. Deploy using the Heroku CLI or GitHub integration.
3. Set the required environment variables in the Heroku dashboard.

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory (do not commit this file):

```
DATABASE_URL=postgresql+asyncpg://username:password@host/database?ssl=require
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000,https://your-cloudflare-domain.pages.dev
```

### Frontend Environment Variables

Add these in the Cloudflare Pages dashboard:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

## Testing the Deployment

1. Test the backend API: `https://your-backend-domain.com/api/`
2. Test the frontend: `https://your-cloudflare-domain.pages.dev`
3. Verify API communication between frontend and backend.

## Continuous Integration / Deployment

For a more advanced setup, consider:

1. GitHub Actions workflows for testing and deploying both components
2. Separate deployment workflows for frontend and backend
3. Environment-specific deployments (staging, production)

## Monorepo Benefits

- **Unified Version Control**: All code in one repository
- **Shared Types**: Frontend and backend can share type definitions
- **Simplified Development**: Run both services locally with single commands
- **Coordinated Deployments**: Deploy related changes together

## Monorepo Drawbacks

- **Deployment Complexity**: Requires separate deployment configurations
- **Repository Size**: Can grow large with combined dependencies
- **Technology-Specific Tools**: May need custom scripts for different parts

## Troubleshooting

- **CORS Issues**: Ensure `ALLOWED_ORIGINS` includes your frontend domain
- **Database Connection**: Verify your database connection string format
- **Environment Variables**: Check that all required variables are set
- **Build Failures**: Review the build logs for specific errors 