# Vertex AI Setup Guide

This guide walks through setting up Google Cloud Vertex AI for LLM-powered narrative generation.

## Prerequisites

- Google Cloud account (free tier available)
- Node.js installed
- `@google-cloud/vertexai` npm package (already installed)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter project name (e.g., `hddl-narrative-gen`)
5. Click **"Create"**
6. Note your **Project ID** (e.g., `hddl-narrative-gen-123456`)

## Step 2: Enable Vertex AI API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for **"Vertex AI API"**
3. Click on it and click **"Enable"**
4. Wait for API to enable (~30 seconds)

## Step 3: Set Up Authentication

### Option A: Application Default Credentials (Recommended for Development)

1. Install Google Cloud CLI:
   - Windows: Download from https://cloud.google.com/sdk/docs/install
   - Or use installer: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe

2. Initialize and authenticate:
   ```powershell
   gcloud init
   gcloud auth application-default login
   ```

3. Follow browser prompts to authenticate

4. Verify authentication:
   ```powershell
   gcloud auth application-default print-access-token
   ```
   (Should print a long token string)

### Option B: Service Account Key (For Production)

1. Go to **IAM & Admin > Service Accounts**
2. Click **"Create Service Account"**
3. Name: `hddl-narrative-generator`
4. Grant role: **Vertex AI User**
5. Click **"Done"**
6. Click on the service account
7. Go to **"Keys"** tab
8. Click **"Add Key" > "Create New Key" > "JSON"**
9. Save the JSON file securely
10. Set environment variable:
    ```powershell
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"
    ```

## Step 4: Set Environment Variables

Add to your PowerShell profile or set temporarily:

```powershell
# Required: Your Google Cloud Project ID
$env:GOOGLE_CLOUD_PROJECT="hddl-narrative-gen-123456"

# Required: Region with Vertex AI support
$env:GOOGLE_CLOUD_LOCATION="us-central1"

# Optional: Service account key (if not using gcloud auth)
# $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"
```

To persist across sessions, add to your PowerShell profile:
```powershell
notepad $PROFILE
```

Add these lines:
```powershell
$env:GOOGLE_CLOUD_PROJECT="your-project-id"
$env:GOOGLE_CLOUD_LOCATION="us-central1"
```

## Step 5: Test Connection

Run the test script:
```bash
cd hddl-sim
node analysis/test-vertex-ai.mjs
```

Expected output:
```
✓ Environment variables configured
✓ Vertex AI client initialized
✓ Test prompt generated successfully
Response: [AI-generated text about insurance governance]
✓ Setup complete!
```

## Step 6: Generate First Narrative

Once the test passes, generate an LLM-enhanced narrative:

```bash
node analysis/narrative-generator.mjs insurance-underwriting --method llm
```

Or hybrid (templates + LLM enrichment):
```bash
node analysis/narrative-generator.mjs insurance-underwriting --method hybrid
```

## Troubleshooting

### Error: "Could not load the default credentials"

**Solution:** Run `gcloud auth application-default login`

### Error: "Vertex AI API has not been used"

**Solution:** 
1. Go to https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
2. Click "Enable"
3. Wait 1-2 minutes and try again

### Error: "User does not have permission to access project"

**Solution:** 
1. Go to IAM & Admin > IAM
2. Find your user account
3. Add role: **Vertex AI User** or **Editor**

### Error: "Location us-central1 not supported"

**Solution:** Try different region:
```powershell
$env:GOOGLE_CLOUD_LOCATION="us-east1"
# or
$env:GOOGLE_CLOUD_LOCATION="europe-west1"
```

### Rate Limits

Free tier limits:
- **Gemini Flash**: 1,500 requests/day, 1M tokens/day
- **Quota exceeded**: Wait 24 hours or upgrade to paid tier

## Cost Estimates

**Gemini 1.5 Flash** (recommended for narrative generation):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Typical narrative generation:**
- Input: ~2,000 tokens (scenario data + prompt)
- Output: ~1,000 tokens (narrative)
- Cost: **~$0.0002 per narrative** (negligible)

**Monthly cost for 100 narratives:** ~$0.02 USD

## Next Steps

Once setup is complete:

1. ✅ Test connection with `test-vertex-ai.mjs`
2. Generate LLM narrative for insurance scenario
3. Compare template vs LLM vs hybrid outputs
4. Implement validation layer to detect hallucinations
5. Tune prompts for better narrative quality
6. Integrate into UI (workspace.js)

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Guide](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Node.js Client Library](https://github.com/googleapis/nodejs-vertexai)
- [Pricing Calculator](https://cloud.google.com/vertex-ai/pricing)
