param(
  [Parameter(Mandatory=$true)][string]$AndroidPath
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $AndroidPath)) {
  throw "Projeto Android nao encontrado em: $AndroidPath"
}

$manifest = Join-Path $AndroidPath 'app\src\main\AndroidManifest.xml'
if (Test-Path $manifest) {
  $content = Get-Content $manifest -Raw
  if ($content -match 'android:allowBackup="[^"]*"') {
    $content = $content -replace 'android:allowBackup="[^"]*"', 'android:allowBackup="false"'
  } else {
    $content = [regex]::Replace($content, '<application\b', '<application android:allowBackup="false"', 1)
  }
  Set-Content -Path $manifest -Value $content -Encoding UTF8
}

$buildGradle = Join-Path $AndroidPath 'app\build.gradle'
if (Test-Path $buildGradle) {
  $content = Get-Content $buildGradle -Raw
  $runNumber = 1
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_RUN_NUMBER)) {
    $parsed = 0
    if ([int]::TryParse($env:GITHUB_RUN_NUMBER, [ref]$parsed) -and $parsed -gt 0) {
      $runNumber = $parsed
    }
  }

  $packageFile = Join-Path (Split-Path $AndroidPath -Parent) 'package.json'
  $versionName = '1.4.2'
  if (Test-Path $packageFile) {
    try {
      $package = Get-Content $packageFile -Raw | ConvertFrom-Json
      if (-not [string]::IsNullOrWhiteSpace([string]$package.version)) {
        $versionName = [string]$package.version
      }
    } catch { }
  }

  $content = $content -replace 'versionCode\s+\d+', "versionCode $runNumber"
  $content = $content -replace 'versionName\s+"[^"]+"', "versionName `"$versionName`""
  Set-Content -Path $buildGradle -Value $content -Encoding UTF8
}

Write-Host 'Ajustes Android do Smart Notes aplicados.' -ForegroundColor Green
