# Azure Deployment Guide for MeraSehar

## Prerequisites

1. **Azure Account** - You need an active Azure subscription
2. **Azure CLI** - Install and authenticate with Azure
3. **Docker** - Docker Desktop should be installed (for local testing)

## Option 1: Azure Container Apps (Recommended)

### Step 1: Install Azure CLI

**Windows:**
```powershell
# Using PowerShell
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'
```

Or download from: https://aka.ms/installazurecliwindows

### Step 2: Authenticate with Azure

```powershell
az login
az account set --subscription <your-subscription-id>
```

### Step 3: Install Azure Container Apps extension

```powershell
az extension add --name containerapp --upgrade
az extension add --name containerapp-preview --upgrade
```

### Step 4: Create resource group and environment

```powershell
az group create --name merasehar-rg --location eastus
az containerapp env create --name merasehar-env --resource-group merasehar-rg --location eastus
```

### Step 5: Build and push Docker images

```powershell
# Build backend image
docker build -t merasehar-backend ./backend

# Build frontend image  
docker build -t merasehar-frontend ./frontend

# Tag images for Azure Container Registry
az acr create --name meraseharacr --resource-group merasehar-rg --sku Basic
az acr login --name meraseharacr
docker tag merasehar-backend meraseharacr.azurecr.io/merasehar-backend:latest
docker tag merasehar-frontend meraseharacr.azurecr.io/merasehar-frontend:latest
docker push meraseharacr.azurecr.io/merasehar-backend:latest
docker push meraseharacr.azurecr.io/merasehar-frontend:latest
```

### Step 6: Deploy PostgreSQL database

```powershell
az containerapp create \
  --name merasehar-db \
  --resource-group merasehar-rg \
  --environment merasehar-env \
  --image postgis/postgis:15-3.3-alpine \
  --target-port 5432 \
  --ingress internal \
  --env-vars POSTGRES_DB=merasehar POSTGRES_USER=merasehar POSTGRES_PASSWORD=merasehar_secret \
  --cpu 0.5 --memory 1Gi
```

### Step 7: Deploy backend

```powershell
az containerapp create \
  --name merasehar-backend \
  --resource-group merasehar-rg \
  --environment merasehar-env \
  --image meraseharacr.azurecr.io/merasehar-backend:latest \
  --target-port 8000 \
  --env-vars DATABASE_URL="postgresql://merasehar:merasehar_secret@merasehar-db:5432/merasehar" SECRET_KEY="production-secret-key-change-me" \
  --cpu 0.5 --memory 1Gi \
  --min-replicas 1 --max-replicas 3
```

### Step 8: Deploy frontend

```powershell
az containerapp create \
  --name merasehar-frontend \
  --resource-group merasehar-rg \
  --environment merasehar-env \
  --image meraseharacr.azurecr.io/merasehar-frontend:latest \
  --target-port 80 \
  --cpu 0.25 --memory 0.5Gi \
  --min-replicas 1 --max-replicas 3 \
  --external
```

### Step 9: Get the frontend URL

```powershell
az containerapp show --name merasehar-frontend --resource-group merasehar-rg --query properties.configuration.ingress.fqdn -o tsv
```

---

## Option 2: Azure App Service (Simpler Alternative)

### Step 1: Install Azure CLI (same as above)

### Step 2: Create App Service Plan

```powershell
az appservice plan create --name merasehar-plan --resource-group merasehar-rg --sku B1 --is-linux
```

### Step 3: Create Web Apps

```powershell
# Backend
az webapp create --name merasehar-backend --resource-group merasehar-rg --plan merasehar-plan --runtime "PYTHON:3.9"

# Frontend  
az webapp create --name merasehar-frontend --resource-group merasehar-rg --plan merasehar-plan --runtime "NODE:18-lts"
```

### Step 4: Deploy using GitHub Actions

Create `.github/workflows/azure-webapp.yml`:

```yaml
name: Deploy to Azure Web App

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy Backend
      uses: azure/webapps-deploy@v2
      with:
        app-name: merasehar-backend
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_BACKEND }}
        package: ./backend
    
    - name: Deploy Frontend
      uses: azure/webapps-deploy@v2
      with:
        app-name: merasehar-frontend
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_FRONTEND }}
        package: ./frontend
```

---

## Option 3: Azure Static Web Apps + Azure Database (Best for React + FastAPI)

### Step 1: Create Azure PostgreSQL Database

```powershell
az postgres server create --name merasehar-db --resource-group merasehar-rg --location eastus --admin-user merasehar --admin-password YourPassword123!
az postgres db create --name merasehar --server-name merasehar-db --resource-group merasehar-rg
```

### Step 2: Deploy Backend to Azure Container Instances

```powershell
az container create \
  --resource-group merasehar-rg \
  --name merasehar-backend \
  --image merasehar-backend:latest \
  --dns-name-label merasehar-backend \
  --ports 8000 \
  --environment-variables DATABASE_URL="postgresql://merasehar@merasehar-db.postgres.database.azure.com:5432/merasehar" SECRET_KEY="your-secret-key"
```

### Step 3: Deploy Frontend to Azure Static Web Apps

Using Azure Portal or CLI:
```powershell
az staticwebapp create \
  --name merasehar-frontend \
  --resource-group merasehar-rg \
  --source https://github.com/yourusername/merasehar \
  --branch main \
  --app-location frontend \
  --output-location dist
```

---

## Important Security Notes

1. **Change default passwords** - Update `POSTGRES_PASSWORD` and `SECRET_KEY` in production
2. **Use Azure Key Vault** - Store secrets securely instead of environment variables
3. **Enable HTTPS** - Configure SSL certificates for all services
4. **Network security** - Use VNet integration for database access
5. **Monitoring** - Enable Azure Monitor and Application Insights

## Cost Estimates

- **Azure Container Apps**: ~$20-50/month (depending on usage)
- **Azure App Service**: ~$10-30/month (Basic tier)
- **Azure Database**: ~$15-50/month (Basic tier)
- **Static Web Apps**: Free tier available

## Troubleshooting

### View logs
```powershell
az containerapp logs show --name merasehar-backend --resource-group merasehar-rg --follow
```

### Check status
```powershell
az containerapp show --name merasehar-backend --resource-group merasehar-rg
```

### Scale resources
```powershell
az containerapp update --name merasehar-backend --resource-group merasehar-rg --min-replicas 2 --max-replicas 5
```
