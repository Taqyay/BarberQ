# BarberQ Dashboard Verification Helper
# This script sets the necessary environment variables for Playwright to run correctly.

$env:HOME = $env:USERPROFILE
Write-Host "Setting `$env:HOME to $env:USERPROFILE..." -ForegroundColor Cyan

Write-Host "Running comprehensive verification..." -ForegroundColor Yellow
node scripts/uat-comprehensive.js
