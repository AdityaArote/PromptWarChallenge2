$ErrorActionPreference = "Continue"
$ProjectID = "promptwarvirtual-493703"

Write-Host "Enabling APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com --project=$ProjectID

Write-Host "Creating Secrets..."
$SupabaseUrl = "https://ameyoiepjadefzvrbcam.supabase.co"
$SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtZXlvaWVwamFkZWZ6dnJiY2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODk2OTUsImV4cCI6MjA5MjM2NTY5NX0.unW-c0IJZYl3WBqDvgPy0540F8lOzOogi7MI5yvaa8A"

Set-Content -Path url.txt -Value $SupabaseUrl -NoNewline
Set-Content -Path key.txt -Value $SupabaseKey -NoNewline

gcloud secrets create VITE_SUPABASE_URL --data-file=url.txt --project=$ProjectID
if ($LASTEXITCODE -ne 0) {
    gcloud secrets versions add VITE_SUPABASE_URL --data-file=url.txt --project=$ProjectID
}

gcloud secrets create VITE_SUPABASE_ANON_KEY --data-file=key.txt --project=$ProjectID
if ($LASTEXITCODE -ne 0) {
    gcloud secrets versions add VITE_SUPABASE_ANON_KEY --data-file=key.txt --project=$ProjectID
}

Remove-Item url.txt
Remove-Item key.txt

Write-Host "Getting Project Number..."
$ProjectNum = gcloud projects describe $ProjectID --format="value(projectNumber)"

Write-Host "Granting Cloud Build IAM access to secrets..."
gcloud secrets add-iam-policy-binding VITE_SUPABASE_URL --member="serviceAccount:$ProjectNum@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=$ProjectID
gcloud secrets add-iam-policy-binding VITE_SUPABASE_ANON_KEY --member="serviceAccount:$ProjectNum@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=$ProjectID

Write-Host "Triggering Cloud Build manually from local source..."
gcloud builds submit --config cloudbuild.yaml . --project=$ProjectID --substitutions=_REGION="asia-south1",_SERVICE_NAME="civicpath",COMMIT_SHA="manual"
