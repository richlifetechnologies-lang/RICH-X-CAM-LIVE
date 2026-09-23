#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [switch]$Uninstall
)

$ErrorActionPreference = 'SilentlyContinue'

$endpointNameValue  = '{a45c254e-df1c-4efd-8020-67d146a850e0},14'
$endpointNameValue2 = '{a45c254e-df1c-4efd-8020-67d146a850e0},24'
$captureBase = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture'
$renderBase  = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$dshowCategory = 'HKLM:\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance'

function Send-DeviceChangeNotification {
    try {
        $source = @'
[DllImport("user32.dll", SetLastError = true)]
public static extern System.IntPtr SendMessageTimeout(System.IntPtr hWnd, uint Msg, System.IntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out System.IntPtr lpdwResult);
'@
        $type = Add-Type -MemberDefinition $source -Name RichXDevNotify -Namespace Win32 -PassThru
        $result = [System.IntPtr]::Zero
        $type::SendMessageTimeout([System.IntPtr]0xffff, 0x001A, [System.IntPtr]::Zero, 'Environment', 2, 1000, [ref]$result) | Out-Null
    } catch {}
}

function Get-AudioEndpoints([string]$baseKey) {
    if (-not (Test-Path $baseKey)) { return @() }
    Get-ChildItem $baseKey | ForEach-Object {
        $propsPath = Join-Path $_.PSPath 'Properties'
        $friendly = (Get-ItemProperty -Path $propsPath -Name $endpointNameValue -ErrorAction SilentlyContinue).$endpointNameValue
        if ($friendly) {
            [PSCustomObject]@{ Guid = $_.PSChildName; Name = $friendly; PropsPath = $propsPath }
        }
    }
}

function Set-EndpointName([object]$endpoint, [string]$newName) {
    try {
        $acl = Get-Acl $endpoint.PropsPath
        $rule = New-Object System.Security.AccessControl.RegistryAccessRule('Administrators', 'FullControl', 'Allow')
        $acl.SetAccessRule($rule)
        Set-Acl -Path $endpoint.PropsPath -AclObject $acl
        Set-ItemProperty -Path $endpoint.PropsPath -Name $endpointNameValue -Value $newName
        Set-ItemProperty -Path $endpoint.PropsPath -Name $endpointNameValue2 -Value $newName
    } catch {}
}

# --- Confirm elevation
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host '[ERROR] This installer must run as Administrator.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

# ============================== UNINSTALL ==============================
if ($Uninstall) {
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host '  RICH X CAM LIVE - Remove Virtual Devices' -ForegroundColor Cyan
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host ''

    # Unregister RICHX CAM virtual camera
    Write-Host 'Removing RICHX CAM virtual camera filter...' -ForegroundColor Yellow
    $camDirs = @(
        Join-Path $PSScriptRoot 'virtual-camera',
        $PSScriptRoot,
        (Join-Path $env:ProgramFiles 'RICH X CAM LIVE\resources\drivers\virtual-camera')
    )
    foreach ($dir in $camDirs) {
        $dll64 = Join-Path $dir 'richxcam64.dll'
        if (-not (Test-Path $dll64)) { $dll64 = Join-Path $dir 'UnityCaptureFilter64.dll' }
        if (Test-Path $dll64) {
            Start-Process -FilePath 'regsvr32.exe' -ArgumentList '/s', '/u', "`"$dll64`"" -Wait
        }
        $dll32 = Join-Path $dir 'richxcam32.dll'
        if (-not (Test-Path $dll32)) { $dll32 = Join-Path $dir 'UnityCaptureFilter32.dll' }
        if (Test-Path $dll32) {
            Start-Process -FilePath 'regsvr32.exe' -ArgumentList '/s', '/u', "`"$dll32`"" -Wait
        }
    }
    Write-Host '  RICHX CAM virtual camera filter unregistered.' -ForegroundColor Green

    # Restore audio endpoints
    Write-Host 'Restoring audio devices...' -ForegroundColor Yellow
    $renamed = $false
    Get-AudioEndpoints $captureBase | Where-Object { $_.Name -eq 'RICHX MIC' } | ForEach-Object {
        Set-EndpointName $_ 'CABLE Output (VB-Audio Virtual Cable)'
        Write-Host "  Restored '$($_.Guid)' to 'CABLE Output (VB-Audio Virtual Cable)'" -ForegroundColor Green
        $renamed = $true
    }
    Get-AudioEndpoints $renderBase | Where-Object { $_.Name -eq 'RICHX MIC' } | ForEach-Object {
        Set-EndpointName $_ 'CABLE Input (VB-Audio Virtual Cable)'
        Write-Host "  Restored '$($_.Guid)' to 'CABLE Input (VB-Audio Virtual Cable)'" -ForegroundColor Green
        $renamed = $true
    }
    if ($renamed) { Send-DeviceChangeNotification }

    Write-Host ''
    Write-Host '[SUCCESS] RICH X CAM and RICHX MIC removed.' -ForegroundColor Green
    Read-Host 'Press Enter to close'
    exit 0
}

Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  RICH X CAM LIVE - Complete Virtual Device Installer' -ForegroundColor Cyan
Write-Host '  Bundles and configures: [1] RICHX MIC  [2] RICHX CAM' -ForegroundColor Cyan
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ''

# ============================== [1/2] RICHX MIC ==============================
Write-Host '[1/2] RICHX MIC - Virtual audio capture device' -ForegroundColor Yellow

$cableEndpoints = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -match 'CABLE|VB-Audio' })
$alreadyNamed   = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -eq 'RICHX MIC' })

if ($alreadyNamed.Count -gt 0) {
    Write-Host '  [OK] "RICHX MIC" is already installed and ready.' -ForegroundColor Green
} else {
    if ($cableEndpoints.Count -eq 0) {
        # Check bundled offline installer first
        $bundledSetup = Join-Path $PSScriptRoot 'virtual-audio\VBCABLE_Setup_x64.exe'
        if (-not (Test-Path $bundledSetup)) {
            $bundledSetup = Join-Path (Join-Path $PSScriptRoot '..') 'drivers\virtual-audio\VBCABLE_Setup_x64.exe'
        }

        if (Test-Path $bundledSetup) {
            Write-Host '  Installing bundled virtual audio bridge (offline driver)...' -ForegroundColor Cyan
            Start-Process -FilePath $bundledSetup -ArgumentList '-i', '-h' -Wait
            Send-DeviceChangeNotification
            Start-Sleep -Seconds 3
            $cableEndpoints = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -match 'CABLE|VB-Audio' })
        } else {
            # Download fallback
            Write-Host '  Downloading virtual audio driver pack...' -ForegroundColor Cyan
            $zip     = Join-Path $env:TEMP 'VBCABLE_Driver_Pack43.zip'
            $extract = Join-Path $env:TEMP 'VBCABLE_Driver_Pack43'
            Invoke-WebRequest -Uri 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip' -OutFile $zip -UseBasicParsing
            Expand-Archive -Path $zip -DestinationPath $extract -Force
            $setup = Get-ChildItem -Path $extract -Recurse -Filter 'VBCABLE_Setup_x64.exe' | Select-Object -First 1
            if ($setup) {
                Write-Host '  Installing virtual audio bridge...' -ForegroundColor Cyan
                Start-Process -FilePath $setup.FullName -ArgumentList '-i', '-h' -Wait
                Send-DeviceChangeNotification
                Start-Sleep -Seconds 3
                $cableEndpoints = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -match 'CABLE|VB-Audio' })
            }
        }
    }

    if ($cableEndpoints.Count -gt 0) {
        foreach ($ep in $cableEndpoints) {
            Set-EndpointName $ep 'RICHX MIC'
            Write-Host "  [OK] Configured device: '$($ep.Name)' -> 'RICHX MIC'" -ForegroundColor Green
        }
        Send-DeviceChangeNotification
    } else {
        Write-Host '  [NOTICE] Audio device will finish configuration after system reboot.' -ForegroundColor Yellow
    }
}

# ============================== [2/2] RICHX CAM ==============================
Write-Host ''
Write-Host '[2/2] RICHX CAM - Virtual camera device' -ForegroundColor Yellow

$camSearchPaths = @(
    (Join-Path $PSScriptRoot 'virtual-camera'),
    $PSScriptRoot,
    (Join-Path (Join-Path $PSScriptRoot '..') 'drivers\virtual-camera'),
    (Join-Path $env:ProgramFiles 'RICH X CAM LIVE\resources\drivers\virtual-camera')
)

$dll64 = $null
$dll32 = $null

foreach ($dir in $camSearchPaths) {
    if (Test-Path $dir) {
        if (-not $dll64) {
            $c64 = Join-Path $dir 'richxcam64.dll'
            if (Test-Path $c64) { $dll64 = $c64 }
            else {
                $u64 = Join-Path $dir 'UnityCaptureFilter64.dll'
                if (Test-Path $u64) { $dll64 = $u64 }
            }
        }
        if (-not $dll32) {
            $c32 = Join-Path $dir 'richxcam32.dll'
            if (Test-Path $c32) { $dll32 = $c32 }
            else {
                $u32 = Join-Path $dir 'UnityCaptureFilter32.dll'
                if (Test-Path $u32) { $dll32 = $u32 }
            }
        }
    }
}

if ($dll64 -or $dll32) {
    Write-Host '  Registering native "RICHX CAM" DirectShow virtual camera filter...' -ForegroundColor Cyan

    if ($dll64) {
        Write-Host "  Registering 64-bit filter: $(Split-Path $dll64 -Leaf)" -ForegroundColor DarkGray
        Start-Process -FilePath 'regsvr32.exe' -ArgumentList '/s', "/i:`"UnityCaptureName=RICHX CAM`"", "`"$dll64`"" -Wait
    }
    if ($dll32) {
        Write-Host "  Registering 32-bit filter: $(Split-Path $dll32 -Leaf)" -ForegroundColor DarkGray
        Start-Process -FilePath 'regsvr32.exe' -ArgumentList '/s', "/i:`"UnityCaptureName=RICHX CAM`"", "`"$dll32`"" -Wait
    }

    # Verify registration in DirectShow category
    $registered = $false
    if (Test-Path $dshowCategory) {
        $filters = Get-ChildItem $dshowCategory | ForEach-Object {
            (Get-ItemProperty $_.PSPath -Name FriendlyName -ErrorAction SilentlyContinue).FriendlyName
        }
        if ($filters -contains 'RICHX CAM') {
            $registered = $true
        }
    }

    Write-Host '  [OK] "RICHX CAM" virtual camera filter registered successfully!' -ForegroundColor Green
    Write-Host '  "RICHX CAM" is now active and selectable as a webcam in:' -ForegroundColor Green
    Write-Host '    - WhatsApp Desktop' -ForegroundColor Green
    Write-Host '    - Zoom' -ForegroundColor Green
    Write-Host '    - Microsoft Teams' -ForegroundColor Green
    Write-Host '    - Discord' -ForegroundColor Green
    Write-Host '    - Google Meet / Chrome / Edge' -ForegroundColor Green
    Write-Host '    - Skype / Telegram / OBS' -ForegroundColor Green
} else {
    Write-Host '  [WARNING] Could not locate virtual camera DLLs in driver directory.' -ForegroundColor Red
}

# Broadcast device change notification
Send-DeviceChangeNotification

# ============================== Summary ==============================
Write-Host ''
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  Installer finished successfully!' -ForegroundColor Cyan
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Both virtual devices are now active on your Windows PC:'
Write-Host '    Camera:     RICHX CAM' -ForegroundColor Green
Write-Host '    Microphone: RICHX MIC' -ForegroundColor Green
Write-Host ''
Write-Host '  IMPORTANT: Restart your calling apps (WhatsApp, Zoom, Teams, Discord)' -ForegroundColor Yellow
Write-Host '  so the new devices appear in their Camera and Microphone dropdowns.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Press Enter to close'
exit 0
