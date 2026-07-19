# Vercel + Railway + External Database Deployment Guide

## Architecture Overview

- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (FastAPI + Python)
- **Database**: External provider (Supabase, Neon, Railway Postgres, or PlanetScale)

---

## Prerequisites

1. GitHub repository with your code
2. Accounts on:
   - [Vercel](https://vercel.com)
   - [Railway](https://railway.app)
   - Database provider (Supabase/Neon/Railway/PlanetScale)

---

## Step 1: Database Setup

### Option A: Supabase (Recommended - Free Tier)

```bash
# Sign up at https://supabase.com
# Create new project
# Get connection string from Settings > Database
```

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Option B: Neon (Serverless Postgres)

```bash
# Sign up at https://neon.tech
# Create new project
# Get connection string from dashboard
```

### Option C: Railway Postgres

```bash
# Sign up at https://railway.app
# Click "New Project" > "Provision PostgreSQL"
# Get connection string from project variables
```

### Option D: PlanetScale (MySQL)

```bash
# Note: Requires backend code changes for MySQL
# Sign up at https://planetscale.com
# Create new database
# Get connection string
```

---

## Step 2: Backend Deployment (Railway)

### 2.1 Prepare Backend for Railway

Create `backend/railway.yaml`:
```yaml
build:
  builder: NIXPACKS
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT

deploy:
  restartPolicyType: ON_FAILURE
  restartPolicyMaxRetries: 10
```

### 2.2 Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL (if using Railway for database)
railway add postgresql

# Deploy backend
railway up
```

### 2.3 Set Environment Variables in Railway

Go to your Railway project > Variables > Add:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
SECRET_KEY=your-production-secret-key
UPLOAD_DIR=/app/uploads
PORT=8000
```

### 2.4 Get Backend URL

After deployment, Railway will provide a URL like:
```
https://your-backend-production.up.railway.app
```

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend for Vercel

Create `frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-production.up.railway.app/api/:path*"
    }
  ]
}
```

### 3.2 Set Environment Variables in Vercel

Go to Vercel dashboard > Your Project > Settings > Environment Variables:

```
VITE_API_URL=https://your-backend-production.up.railway.app
```

### 3.3 Update Frontend Code

In your frontend code, use the environment variable:

```javascript
// In your API calls
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### 3.4 Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

**Option B: Via Git Integration**
1. Push code to GitHub
2. Go to Vercel dashboard > "Add New Project"
3. Import your GitHub repository
4. Select `frontend` directory as root directory
5. Click "Deploy"

---

## Step 4: CORS Configuration

Update your FastAPI backend to allow requests from Vercel:

In `backend/app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://your-vercel-app.vercel.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 5: Database Migration

### Run migrations on Railway

```bash
# Connect to Railway shell
railway shell

# Run migrations
python -m alembic upgrade head
```

Or add a deployment script in `backend/railway.yaml`:
```yaml
deploy:
  healthcheckPath: /health
  healthcheckTimeout: 300
  startCommand: bash -c "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

---

## Step 6: Update Frontend API Calls

Ensure all frontend API calls use the correct base URL:

```javascript
// Example in React component
const API_BASE = import.meta.env.VITE_API_URL;

const fetchData = async () => {
  const response = await fetch(`${API_BASE}/your-endpoint`);
  return response.json();
};
```

---

## Cost Comparison

### Vercel (Frontend)
- **Hobby**: Free (100GB bandwidth, 6 builds/day)
- **Pro**: $20/month (unlimited bandwidth, 1TB builds)

### Railway (Backend)
- **Free**: $5 credit/month (good for small projects)
- **Pay-as-you-go**: ~$5-20/month depending on usage

### Database Options
- **Supabase**: Free tier (500MB database)
- **Neon**: Free tier (0.5GB storage, 3 Project Branches)
- **Railway Postgres**: Included in Railway usage
- **PlanetScale**: Free tier (5GB storage, 1B rows read)

**Total Estimated Cost**: $0-30/month for most use cases

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: railwayapp/cli-action@v1.0.0
        with:
          service: your-railway-service-id
          command: up

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend
```

---

## Monitoring & Logs

### Railway Logs
```bash
railway logs
```

### Vercel Logs
- Go to Vercel dashboard > Your Project > Logs
- Real-time logs for deployments and function calls

### Database Monitoring
- **Supabase**: Dashboard > Database > Logs
- **Neon**: Dashboard > Branches > Logs
- **Railway**: Project > Service > Logs

---

## Troubleshooting

### CORS Errors
- Verify backend CORS settings include your Vercel domain
- Check that `VITE_API_URL` is set correctly in Vercel

### Database Connection Issues
- Verify DATABASE_URL format
- Check database allows connections from Railway IPs
- Ensure database is not in sleep mode (free tiers)

### Build Failures
- Check Railway build logs: `railway logs`
- Verify all dependencies in requirements.txt
- Check Vercel build logs in dashboard

### Environment Variables Not Working
- Ensure variables are set in correct environment (Production vs Preview)
- Restart services after adding variables
- Check variable names match exactly (case-sensitive)

---

## Security Best Practices

1. **Use Secret Management**
   - Railway: Use built-in secrets
   - Vercel: Use environment variables
   - Database: Use connection strings with strong passwords

2. **Enable HTTPS**
   - Both Vercel and Railway provide automatic SSL

3. **Rate Limiting**
   - Implement rate limiting in FastAPI backend
   - Use Vercel's built-in rate limiting for API routes

4. **Database Backups**
   - Configure automated backups in your database provider
   - Supabase: Settings > Database > Backups
   - Neon: Automatic backups included

5. **Monitor Usage**
   - Set up alerts for unusual activity
   - Monitor Railway and Vercel usage dashboards

---

## Rollback Procedures

### Railway Rollback
```bash
railway rollback
```

### Vercel Rollback
- Go to Deployments in Vercel dashboard
- Click "..." on previous deployment
- Select "Promote to Production"

---

## Next Steps

1. Set up database provider and get connection string
2. Deploy backend to Railway
3. Configure environment variables
4. Deploy frontend to Vercel
5. Update CORS settings
6. Run database migrations
7. Test all API endpoints
8. Set up monitoring and alerts
