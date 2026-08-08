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
$versionName = '1.5.4'
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


# Permissão necessária apenas para Android 9 ou anterior. Em Android 10+ o plugin
# usa MediaStore e grava diretamente em Downloads sem solicitar acesso amplo.
$manifestContent = Get-Content -LiteralPath $manifest -Raw
if ($manifestContent -notmatch 'android.permission.WRITE_EXTERNAL_STORAGE') {
  $manifestContent = [regex]::Replace(
    $manifestContent,
    '<application\b',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />' + [Environment]::NewLine + '    <application',
    1
  )
  Set-Content -LiteralPath $manifest -Value $manifestContent -Encoding utf8
}

# Plugin nativo local para salvar imagens na pasta pública Downloads do Android.
# O projeto Android é recriado em cada workflow, então o plugin é aplicado aqui.
$javaPackagePath = Join-Path $AndroidPath 'app/src/main/java/com/smartnotes/app'
New-Item -ItemType Directory -Path $javaPackagePath -Force | Out-Null

$downloadsPlugin = @'
package com.smartnotes.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "Downloads",
    permissions = {
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }
        )
    }
)
public class DownloadsPlugin extends Plugin {

    @PluginMethod()
    public void saveBase64(PluginCall call) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermsCallback");
            return;
        }
        saveFile(call);
    }

    @PermissionCallback
    private void storagePermsCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            saveFile(call);
        } else {
            call.reject("Permissão de armazenamento necessária para salvar em Downloads.");
        }
    }

    private void saveFile(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", "smart-notes-imagem.png"));
        String mimeType = call.getString("mimeType", "image/png");
        String base64 = call.getString("base64");

        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("Conteúdo da imagem não informado.");
            return;
        }

        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            String publicPath;
            String uriString;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new IllegalStateException("Android não forneceu um destino em Downloads.");
                }

                try (OutputStream stream = resolver.openOutputStream(uri)) {
                    if (stream == null) {
                        resolver.delete(uri, null, null);
                        throw new IllegalStateException("Não foi possível abrir o arquivo de destino.");
                    }
                    stream.write(data);
                    stream.flush();
                } catch (Exception error) {
                    resolver.delete(uri, null, null);
                    throw error;
                }

                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
                publicPath = "Downloads/" + fileName;
                uriString = uri.toString();
            } else {
                File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File destination = uniqueFile(downloads, fileName);
                try (FileOutputStream stream = new FileOutputStream(destination)) {
                    stream.write(data);
                    stream.flush();
                }
                publicPath = "Downloads/" + destination.getName();
                uriString = Uri.fromFile(destination).toString();
            }

            JSObject result = new JSObject();
            result.put("path", publicPath);
            result.put("uri", uriString);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível salvar a imagem em Downloads.", null, error);
        }
    }

    private File uniqueFile(File directory, String fileName) {
        File candidate = new File(directory, fileName);
        if (!candidate.exists()) return candidate;

        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        String extension = dot > 0 ? fileName.substring(dot) : "";
        int index = 1;

        while (candidate.exists()) {
            candidate = new File(directory, base + " (" + index + ")" + extension);
            index += 1;
        }
        return candidate;
    }

    private String sanitizeFileName(String value) {
        String sanitized = value == null ? "smart-notes-imagem.png" : value.trim();
        sanitized = sanitized.replaceAll("[\\\\/:*?\"<>|]", "_");
        return sanitized.isEmpty() ? "smart-notes-imagem.png" : sanitized;
    }
}
'@
Set-Content -LiteralPath (Join-Path $javaPackagePath 'DownloadsPlugin.java') -Value $downloadsPlugin -Encoding utf8

$mainActivity = @'
package com.smartnotes.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
'@
Set-Content -LiteralPath (Join-Path $javaPackagePath 'MainActivity.java') -Value $mainActivity -Encoding utf8

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
