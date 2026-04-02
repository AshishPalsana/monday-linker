# IDs from your monday.com Developer Center
$APP_ID = "11037177"
$VERSION_ID = "13553162"
$FEATURE_ID = "16843003"

# Load API token from .env file
if (Test-Path ".env") {
    $env_content = Get-Content ".env"
    foreach ($line in $env_content) {
        if ($line -like "VITE_MONDAY_API_TOKEN=*") {
            $env:MONDAY_APP_API_TOKEN = $line.Substring("VITE_MONDAY_API_TOKEN=".Length)
            Write-Host "Loaded MONDAY_APP_API_TOKEN from .env file"
        }
    }
}

if (-not $env:MONDAY_APP_API_TOKEN) {
    Write-Error "MONDAY_APP_API_TOKEN not found in .env or environment variables"
    exit 1
}

# Build the project
npm run build

# Check if build was successful
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit $LASTEXITCODE
}

# Push to monday.com
Write-Host "Pushing code to monday.com..."
npx @mondaycom/apps-cli app-features:build -a $APP_ID -i $VERSION_ID -d $FEATURE_ID -t monday_code_cdn
