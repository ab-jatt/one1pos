# Azure Deployment Guide — NexusPOS

## Architecture

```
User (Browser)
      │
      ▼
┌─────────────────────────────┐
│  Frontend Container App     │  ← nginx serving React SPA
│  (Azure Container Apps)     │
│  https://nexuspos-frontend. │
│    <region>.azurecontainer   │
│    apps.io                  │
└──────────┬──────────────────┘
           │  VITE_API_URL (baked at build)
           ▼
┌─────────────────────────────┐
│  Backend Container App      │  ← NestJS + Prisma
│  (Azure Container Apps)     │
│  https://nexuspos-backend.  │
│    <region>.azurecontainer   │
│    apps.io                  │
└──────────┬──────────────────┘
           │  DATABASE_URL
           ▼
┌─────────────────────────────┐
│  Neon PostgreSQL            │  ← Serverless Postgres
│  (external, not in Azure)   │
└─────────────────────────────┘
```

---

## Prerequisites

- Azure CLI installed (`az --version`)
- Docker Desktop running
- A Neon PostgreSQL database created at https://neon.tech
  - Copy the connection string (format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

---

## Step 1 — Set Variables

Open PowerShell and set these once. Every command below references them.

```powershell
# ── Actual deployed values ───────────────────────────────────
$RG          = "one1pos-rg"                # Resource group name
$LOCATION    = "centralindia"               # Azure region
$ACR_NAME    = "one1posacr"                 # Container Registry
$ACR_SERVER  = "one1posacr.azurecr.io"     # ACR login server
$ENV_NAME    = "one1pos-env"               # Container Apps environment
$BACKEND     = "one1pos-backend"           # Backend container app name
$FRONTEND    = "one1pos-frontend"          # Frontend container app name

# Public URLs
$BACKEND_URL = "one1pos-backend.agreeableisland-fbc11061.centralindia.azurecontainerapps.io"
$FRONTEND_URL = "one1pos-frontend.agreeableisland-fbc11061.centralindia.azurecontainerapps.io"

# ── Secrets — replace placeholders ───────────────────────────
$DATABASE_URL        = "postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
$FIREBASE_PROJECT_ID = "one1pos"
```

---

## Step 2 — Login & Create Resources

```powershell
# Login to Azure
az login

# Create resource group
az group create --name $RG --location $LOCATION

# Create Azure Container Registry (Basic SKU is cheapest)
az acr create --resource-group $RG --name $ACR_NAME --sku Basic --admin-enabled true

# Get ACR login server name (e.g. nexusposacr.azurecr.io)
$ACR_SERVER = (az acr show --name $ACR_NAME --query loginServer -o tsv)

# Login Docker to ACR
az acr login --name $ACR_NAME
```

---

## Step 3 — Build & Push Docker Images

Run from the project root (`d:\pos_project\Pos_project`).

### 3a. Backend Image

```powershell
# Build backend image
docker build -t "${ACR_SERVER}/nexuspos-backend:latest" ./nexus-backend

# Push to ACR
docker push "${ACR_SERVER}/nexuspos-backend:latest"
```

### 3b. Frontend Image

The `VITE_API_URL` is baked into the JS bundle at build time, so we need the
backend's public URL first. We'll deploy the backend first, get its URL, then
build the frontend.

**Skip this step for now — come back after Step 5a.**

---

## Step 4 — Create Container Apps Environment

```powershell
# Install/update the Container Apps extension
az extension add --name containerapp --upgrade

# Register required providers (one-time)
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# Create the environment (shared networking + logging for all apps)
az containerapp env create `
  --name $ENV_NAME `
  --resource-group $RG `
  --location $LOCATION
```

---

## Step 5 — Deploy Containers

### 5a. Deploy Backend

```powershell
# Get ACR credentials
$ACR_USER = (az acr credential show --name $ACR_NAME --query username -o tsv)
$ACR_PASS = (az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Deploy backend container
az containerapp create `
  --name $BACKEND `
  --resource-group $RG `
  --environment $ENV_NAME `
  --image "${ACR_SERVER}/nexuspos-backend:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --target-port 8080 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --env-vars `
    "NODE_ENV=production" `
    "PORT=8080" `
    "DATABASE_URL=$DATABASE_URL" `
    "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID" `
    "CORS_ORIGIN=*"

# Get the backend's public URL
$BACKEND_URL = (az containerapp show --name $BACKEND --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv)
Write-Host "Backend URL: https://$BACKEND_URL"
```

> **Note on CORS_ORIGIN:** We set `*` initially. After the frontend is deployed,
> update it to the frontend's exact URL (see Step 6).

### 5b. Build & Push Frontend (now that we have the backend URL)

```powershell
# Build frontend image with the real backend API URL baked in
docker build `
  --build-arg VITE_API_URL="https://${BACKEND_URL}/api" `
  -t "${ACR_SERVER}/nexuspos-frontend:latest" `
  ./nexus-enterprise-pos

# Push to ACR
docker push "${ACR_SERVER}/nexuspos-frontend:latest"
```

### 5c. Deploy Frontend

```powershell
az containerapp create `
  --name $FRONTEND `
  --resource-group $RG `
  --environment $ENV_NAME `
  --image "${ACR_SERVER}/nexuspos-frontend:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --target-port 80 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3 `
  --cpu 0.25 `
  --memory 0.5Gi

# Get the frontend's public URL
$FRONTEND_URL = (az containerapp show --name $FRONTEND --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv)
Write-Host "Frontend URL: https://$FRONTEND_URL"
```

---

## Step 6 — Lock Down CORS

Now that both URLs are known, restrict CORS to only the frontend:

```powershell
az containerapp update `
  --name $BACKEND `
  --resource-group $RG `
  --set-env-vars "CORS_ORIGIN=https://$FRONTEND_URL"
```

---

## Step 7 — Run Migrations & Seed

Migrations run automatically on every container start (`prisma migrate deploy`
is the container's CMD). To run the seed once:

```powershell
# Open a shell in the running backend container
az containerapp exec `
  --name $BACKEND `
  --resource-group $RG `
  --command "node" -- "prisma/seed.js"
```

Or use the Prisma CLI inside the container:

```powershell
az containerapp exec `
  --name $BACKEND `
  --resource-group $RG `
  --command "node_modules/.bin/prisma" -- "db" "seed"
```

---

## Step 8 — Verify

```powershell
# Backend health check
Invoke-RestMethod "https://$BACKEND_URL/api/health"

# Dashboard data
Invoke-RestMethod "https://$BACKEND_URL/api/dashboard/top-products"

# Open frontend in browser
Start-Process "https://$FRONTEND_URL"
```

---

## Updating After Code Changes

```powershell
# ── Backend ──────────────────────────────────────────────────
docker build -t "${ACR_SERVER}/nexuspos-backend:latest" ./nexus-backend
docker push "${ACR_SERVER}/nexuspos-backend:latest"
az containerapp update --name $BACKEND --resource-group $RG --image "${ACR_SERVER}/nexuspos-backend:latest"

# ── Frontend (only if VITE_API_URL changed or code changed) ──
docker build --build-arg VITE_API_URL="https://${BACKEND_URL}/api" -t "${ACR_SERVER}/nexuspos-frontend:latest" ./nexus-enterprise-pos
docker push "${ACR_SERVER}/nexuspos-frontend:latest"
az containerapp update --name $FRONTEND --resource-group $RG --image "${ACR_SERVER}/nexuspos-frontend:latest"
```

---

## Cost Management

```powershell
# Scale to zero when not in use (Container Apps bills per second of vCPU/memory)
az containerapp update --name $BACKEND  --resource-group $RG --min-replicas 0
az containerapp update --name $FRONTEND --resource-group $RG --min-replicas 0

# Delete everything when done
az group delete --name $RG --yes --no-wait
```

---

## Environment Variables Reference

| Variable | Container | Description |
|---|---|---|
| `DATABASE_URL` | Backend | Neon PostgreSQL connection string (with `?sslmode=require`) |
| `NODE_ENV` | Backend | `production` |
| `PORT` | Backend | `8080` |
| `FIREBASE_PROJECT_ID` | Backend | Firebase project ID for auth |
| `SUPABASE_URL` | Backend | Supabase project URL (Settings → API → Project URL) |
| `SUPABASE_ANON_KEY` | Backend | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Supabase service_role key — **required for Google Sign-In owner lookup** |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend | Firebase service account JSON (single-line) — **required for Google Sign-In token verification** |
| `CORS_ORIGIN` | Backend | Frontend URL — `https://one1pos-frontend.agreeableisland-fbc11061.centralindia.azurecontainerapps.io` |
| `VITE_API_URL` | Frontend (build-arg) | Backend URL + `/api` suffix, baked at build time |

### Setting new env vars on the live backend

```powershell
az containerapp update `
  --name one1pos-backend `
  --resource-group one1pos-rg `
  --set-env-vars `
    "SUPABASE_URL=https://xxxx.supabase.co" `
    "SUPABASE_ANON_KEY=eyJ..." `
    "SUPABASE_SERVICE_ROLE_KEY=eyJ..." `
    "FIREBASE_SERVICE_ACCOUNT_JSON={...single-line JSON...}"
```

---

## Troubleshooting

```powershell
# View backend logs
az containerapp logs show --name $BACKEND --resource-group $RG --follow

# View frontend logs
az containerapp logs show --name $FRONTEND --resource-group $RG --follow

# Check container revisions
az containerapp revision list --name $BACKEND --resource-group $RG -o table

# Restart a container
az containerapp revision restart --name $BACKEND --resource-group $RG --revision <revision-name>
```
