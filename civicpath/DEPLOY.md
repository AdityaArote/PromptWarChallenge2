# CivicPath — Deployment Runbook

## Prerequisites

Install these CLIs if not already present:
- `npm install -g supabase` (Supabase CLI)
- `gcloud` (Google Cloud SDK)
- `docker` (for local build testing)

---

## Step 1: Supabase Setup

### 1a. Create Supabase Project
1. Go to → https://supabase.com/dashboard/new/_
2. Fill in:
   - **Name:** civicpath
   - **Password:** (generate strong password, save it)
   - **Region:** Southeast Asia (Singapore) — closest to India
3. Click **Create new project** — wait ~1 min

### 1b. Get API Keys
Settings → API:
- Copy **Project URL** (format: `https://XXXX.supabase.co`)
- Copy **anon public** key

### 1c. Update .env.local
```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 1d. Run Database Migration
Option A — Supabase CLI:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Option B — Dashboard SQL editor:
Paste the contents of `supabase/migrations/001_init.sql` into the SQL editor.

### 1e. Deploy Edge Function + Set Secrets
```bash
# Set the Gemini API key (NEVER add to .env files)
supabase secrets set GEMINI_API_KEY=AIzaSy_YOUR_KEY_HERE

# Deploy the Edge Function
supabase functions deploy gemini-chat
```

### 1f. Verify
- Go to Table Editor → you should see `election_phases` with 6 rows
- Go to Edge Functions → `gemini-chat` should show as Active

---

## Step 2: GCP Project Setup

### 2a. Authenticate + Create Project
```bash
gcloud auth login
gcloud projects create civicpath-app --name="CivicPath"
gcloud config set project civicpath-app
```

### 2b. Enable Required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  logging.googleapis.com
```

### 2c. Store Supabase Keys in Secret Manager
```bash
# Store Supabase URL (public but protect for build reproducibility)
echo -n "https://YOUR_REF.supabase.co" | \
  gcloud secrets create VITE_SUPABASE_URL --data-file=-

# Store anon key
echo -n "eyJhbGci..." | \
  gcloud secrets create VITE_SUPABASE_ANON_KEY --data-file=-
```

### 2d. Grant Cloud Build access to Secret Manager
```bash
PROJECT_NUM=$(gcloud projects describe civicpath-app --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding VITE_SUPABASE_URL \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding VITE_SUPABASE_ANON_KEY \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2e. First Manual Deploy (verifies everything works)
```bash
# Build + tag
docker build -t gcr.io/civicpath-app/civicpath:latest .

# Push to GCR
docker push gcr.io/civicpath-app/civicpath:latest

# Deploy to Cloud Run in Mumbai (asia-south1)
gcloud run deploy civicpath \
  --image=gcr.io/civicpath-app/civicpath:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="VITE_SUPABASE_URL=https://YOUR_REF.supabase.co,VITE_SUPABASE_ANON_KEY=YOUR_KEY"
```

---

## Step 3: Cloud Build CI/CD (Automated)

### 3a. Connect GitHub Repo
- Cloud Console → Cloud Build → Triggers → Connect Repository
- Link your GitHub repo

### 3b. Create Build Trigger
```bash
gcloud builds triggers create github \
  --repo-name=civicpath \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml
```

### 3c. Test Trigger
Push any commit to `main` → Cloud Build will run automatically.

---

## Step 4: Supabase Edge Function — Verify Live

Test with cURL (replace with your project URL and anon key):
```bash
curl -X POST https://YOUR_REF.supabase.co/functions/v1/gemini-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "question": "What documents do I need to vote?",
    "phase_id": "registration",
    "phase_title": "Voter Registration",
    "voter_type": "first_time",
    "language": "en"
  }'
```

Expected response:
```json
{ "answer": "To register as a voter in India..." }
```

---

## Deployed URLs (fill in after deployment)

| Service | URL |
|---|---|
| CivicPath Web App | https://civicpath-HASH-as.a.run.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/YOUR_REF |
| Cloud Build | https://console.cloud.google.com/cloud-build |
| Cloud Logging | https://console.cloud.google.com/logs |
