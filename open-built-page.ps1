param(
  [switch]$SkipBuild,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distIndex = Join-Path $projectRoot 'dist\index.html'

Push-Location $projectRoot
try {
  if (-not $SkipBuild -or -not (Test-Path $distIndex)) {
    Write-Host 'Building the site...'
    npm run build

    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }

  if (-not (Test-Path $distIndex)) {
    throw "Expected built file was not found: $distIndex"
  }

  if ($NoOpen) {
    Write-Host "Build verified. Ready to open: $distIndex"
    exit 0
  }

  Write-Host "Opening: $distIndex"
  Start-Process $distIndex
}
finally {
  Pop-Location
}
