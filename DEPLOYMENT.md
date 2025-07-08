# Cloudflare Pages Deployment Guide

This guide will help you deploy the iAmmr application to Cloudflare Pages.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain** (Optional): You can use a custom domain or Cloudflare's provided subdomain
3. **API Keys**: OpenRouter API key (optional, has default for testing)

## Deployment Methods

### Method 1: Git Integration (Recommended)

1. **Connect Repository to Cloudflare Pages**
   ```bash
   # Go to Cloudflare Dashboard > Pages > Create a project
   # Connect to Git and select your repository
   ```

2. **Configure Build Settings**
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `yarn build`
   - **Build output directory**: `out`
   - **Root directory**: `/` (leave empty if repository root)

3. **Environment Variables**
   Add these in Cloudflare Pages Dashboard > Settings > Environment variables:
   ```
   NODE_VERSION=20
   YARN_VERSION=1.22.22
   OPENROUTER_API_KEY=your_api_key_here (optional)
   GOOGLE_CLIENT_ID=your_google_client_id (optional)
   ```

4. **Deploy**
   - Push to your main branch
   - Cloudflare will automatically build and deploy

### Method 2: Wrangler CLI

1. **Install Wrangler** (if not already installed)
   ```bash
   npm install -g wrangler
   # or
   yarn global add wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Build and Deploy**
   ```bash
   # Build the application
   yarn build
   
   # Deploy to Cloudflare Pages
   wrangler pages deploy out --project-name=iammr
   ```

4. **Set Environment Variables** (via Cloudflare Dashboard)
   - Go to Cloudflare Dashboard > Pages > iammr > Settings > Environment variables
   - Add your environment variables there instead of using CLI secrets

**Note**: For Pages projects, environment variables should be set in the Cloudflare Dashboard rather than via CLI.

### Method 3: Direct Upload

1. **Build the Project**
   ```bash
   yarn build
   ```

2. **Upload to Cloudflare Pages**
   - Go to Cloudflare Dashboard > Pages
   - Click "Upload assets"
   - Upload the `out` folder contents

## Configuration Details

### Build Configuration
```toml
[build]
command = "npm run build"
publish = "out"

[build.environment]
NODE_VERSION = "20"
NPM_FLAGS = "--legacy-peer-deps"
```

### Custom Domain Setup

1. **Add Domain in Cloudflare Pages**
   - Go to your project > Custom domains
   - Add your domain
   - Update DNS records as instructed

2. **SSL Certificate**
   - Cloudflare automatically provides SSL
   - Enable "Always Use HTTPS" in SSL/TLS settings

### Performance Optimization

The application is configured for optimal Cloudflare performance:

- **Static Export**: Full static site generation
- **Image Optimization**: Disabled for compatibility
- **Caching Headers**: Configured for static assets
- **Security Headers**: Added for enhanced security

## Environment Variables

### Required for Full Functionality
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
```

### Optional Configuration
```env
NEXT_PUBLIC_APP_URL=https://your-domain.pages.dev
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (should be 18+)
   - Verify all dependencies are installed
   - Check build logs for TypeScript errors

2. **Wrangler Configuration Errors**
   - Error: "environment names that are not supported by Pages"
   - Solution: Pages only supports "preview" and "production" environments
   - Remove any "staging" or custom environment names from wrangler.toml

3. **Environment Variables Not Working**
   - Ensure variables are set in Cloudflare dashboard
   - Don't use `wrangler pages secret` - use dashboard instead
   - Restart deployment after adding variables
   - Check variable names match exactly

4. **Images Not Loading**
   - Verify images are in the `public` folder
   - Check image paths are relative
   - Ensure `unoptimized: true` in next.config.mjs

5. **API Routes Not Working**
   - Static export doesn't support API routes
   - Move API functionality to external services
   - Use client-side API calls instead

### Performance Tips

1. **Enable Cloudflare Features**
   - Auto Minify (CSS, JS, HTML)
   - Brotli compression
   - Browser caching

2. **Optimize Images**
   - Use WebP format when possible
   - Compress images before upload
   - Use appropriate image sizes

3. **Monitor Performance**
   - Use Cloudflare Analytics
   - Monitor Core Web Vitals
   - Check page load times

## Post-Deployment

### Verification Steps

1. **Test Application**
   - Visit your deployment URL
   - Test all main features
   - Verify responsive design

2. **Check Performance**
   - Run Lighthouse audit
   - Test loading speeds
   - Verify mobile experience

3. **Monitor Logs**
   - Check Cloudflare Analytics
   - Monitor error rates
   - Track user interactions

### Updates and Maintenance

1. **Continuous Deployment**
   - Push to main branch for auto-deployment
   - Use preview deployments for testing
   - Monitor build status

2. **Environment Management**
   - Use different environments (staging/production)
   - Test changes in preview before production
   - Keep API keys secure and rotated

## Support

- **Cloudflare Docs**: [developers.cloudflare.com](https://developers.cloudflare.com/pages/)
- **Community**: [community.cloudflare.com](https://community.cloudflare.com)
- **Status**: [cloudflarestatus.com](https://cloudflarestatus.com)

---

Your iAmmr application is now ready for Cloudflare Pages deployment! 🚀