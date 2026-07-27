param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$AndroidPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AndroidPath = [IO.Path]::GetFullPath($AndroidPath)
if (-not (Test-Path -LiteralPath $AndroidPath -PathType Container)) {
  throw "Projeto Android nao encontrado em: $AndroidPath"
}

$manifest = Join-Path $AndroidPath 'app/src/main/AndroidManifest.xml'
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
  throw "AndroidManifest.xml nao encontrado em: $manifest"
}

$manifestContent = Get-Content -LiteralPath $manifest -Raw
if ($manifestContent -match 'android:allowBackup="[^"]*"') {
  $manifestContent = $manifestContent -replace 'android:allowBackup="[^"]*"', 'android:allowBackup="false"'
} else {
  $manifestContent = [regex]::Replace($manifestContent, '<application\b', '<application android:allowBackup="false"', 1)
}
Set-Content -LiteralPath $manifest -Value $manifestContent -Encoding utf8

$buildGradle = Join-Path $AndroidPath 'app/build.gradle'
if (-not (Test-Path -LiteralPath $buildGradle -PathType Leaf)) {
  throw "app/build.gradle nao encontrado em: $buildGradle"
}

$runNumber = 1
$parsedRunNumber = 0
if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_RUN_NUMBER) -and [int]::TryParse($env:GITHUB_RUN_NUMBER, [ref]$parsedRunNumber) -and $parsedRunNumber -gt 0) {
  $runNumber = $parsedRunNumber
}

$packageFile = Join-Path (Split-Path -Parent $AndroidPath) 'package.json'
$versionName = '1.4.4'
if (Test-Path -LiteralPath $packageFile -PathType Leaf) {
  $package = Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json
  if (-not [string]::IsNullOrWhiteSpace([string]$package.version)) {
    $versionName = [string]$package.version
  }
}

$gradleContent = Get-Content -LiteralPath $buildGradle -Raw
$gradleContent = $gradleContent -replace 'versionCode\s+\d+', "versionCode $runNumber"
$gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$versionName`""
Set-Content -LiteralPath $buildGradle -Value $gradleContent -Encoding utf8

$resPath = Join-Path $AndroidPath 'app/src/main/res'
$iconSource = Join-Path $PSScriptRoot 'android-icons'

# Remove os recursos padrao (.webp/.xml/.png) para evitar nomes duplicados no AAPT.
Get-ChildItem -LiteralPath $resPath -Recurse -File | Where-Object {
  $_.BaseName -in @('ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground', 'ic_launcher_background')
} | Remove-Item -Force
$densities = @('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi')
foreach ($density in $densities) {
  $sourceDir = Join-Path $iconSource "mipmap-$density"
  $targetDir = Join-Path $resPath "mipmap-$density"
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceDir 'ic_launcher.png') -Destination (Join-Path $targetDir 'ic_launcher.png') -Force
  Copy-Item -LiteralPath (Join-Path $sourceDir 'ic_launcher_round.png') -Destination (Join-Path $targetDir 'ic_launcher_round.png') -Force
}

$drawableNoDpi = Join-Path $resPath 'drawable-nodpi'
New-Item -ItemType Directory -Path $drawableNoDpi -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $iconSource 'ic_launcher_foreground.png') -Destination (Join-Path $drawableNoDpi 'ic_launcher_foreground.png') -Force

$values = Join-Path $resPath 'values'
New-Item -ItemType Directory -Path $values -Force | Out-Null
@'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B2F33</color>
</resources>
'@ | Set-Content -LiteralPath (Join-Path $values 'ic_launcher_background.xml') -Encoding utf8

$adaptive = Join-Path $resPath 'mipmap-anydpi-v26'
New-Item -ItemType Directory -Path $adaptive -Force | Out-Null
$adaptiveXml = @'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
'@
$adaptiveXml | Set-Content -LiteralPath (Join-Path $adaptive 'ic_launcher.xml') -Encoding utf8
$adaptiveXml | Set-Content -LiteralPath (Join-Path $adaptive 'ic_launcher_round.xml') -Encoding utf8

Write-Host "Ajustes Android aplicados: Smart Notes $versionName (versionCode $runNumber)." -ForegroundColor Green
