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
    Get-ChildItem $baseKey | ForEach-Object {
        $propsPath = Join-Path $_.PSPath 'Properties'
        $friendly = (Get-ItemProperty -Path $propsPath -Name $endpointNameValue -ErrorAction SilentlyContinue).$endpointNameValue
        if ($friendly) {
            [PSCustomObject]@{ Guid = $_.PSChildName; Name = $friendly; PropsPath = $propsPath }
        }
    }
}

function Set-EndpointName([object]$endpoint, [string]$newName) {
    $acl = Get-Acl $endpoint.PropsPath
    $rule = New-Object System.Security.AccessControl.RegistryAccessRule('Administrators', 'FullControl', 'Allow')
    $acl.SetAccessRule($rule)
    Set-Acl -Path $endpoint.PropsPath -AclObject $acl
    Set-ItemProperty -Path $endpoint.PropsPath -Name $endpointNameValue -Value $newName
    Set-ItemProperty -Path $endpoint.PropsPath -Name $endpointNameValue2 -Value $newName
}

# --- Confirm elevation
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host '[ERROR] This installer must run as Administrator.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

if ($Uninstall) {
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host '  RICH X CAM LIVE - Remove Virtual Devices' -ForegroundColor Cyan
    Write-Host '========================================================================' -ForegroundColor Cyan
    Write-Host ''

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
    Write-Host 'To fully remove the virtual audio cable driver:' -ForegroundColor Yellow
    Write-Host '  1. Open Windows Settings -> Apps -> Installed apps'
    Write-Host '  2. Find "VB-Audio Virtual Cable" and uninstall it'
    Write-Host '  3. Or re-run the VB-CABLE setup executable with:  VBCABLE_Setup_x64.exe -u -h'
    Write-Host ''
    Read-Host 'Press Enter to close'
    exit 0
}

Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  RICH X CAM LIVE - Virtual Device Installer' -ForegroundColor Cyan
Write-Host '  Creates the "RICHX MIC" audio endpoint for calling apps' -ForegroundColor Cyan
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ''

# ============================== RICHX MIC ==============================
Write-Host '[1/2] RICHX MIC - Virtual audio capture device' -ForegroundColor Yellow

$cableEndpoints = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -match 'CABLE|VB-Audio' })
$alreadyNamed   = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -eq 'RICHX MIC' })

if ($alreadyNamed.Count -gt 0) {
    Write-Host "  'RICHX MIC' is already installed." -ForegroundColor Green
}
elseif ($cableEndpoints.Count -eq 0) {
    Write-Host '  No VB-CABLE virtual audio device found on this PC.' -ForegroundColor DarkYellow
    $answer = Read-Host '  Download and install the official VB-CABLE driver (free, from vb-audio.com)? [Y/N]'
    if ($answer -match '^[Yy]$') {
        $zip     = Join-Path $env:TEMP 'VBCABLE_Driver_Pack43.zip'
        $extract = Join-Path $env:TEMP 'VBCABLE_Driver_Pack43'
        Write-Host '  Downloading VB-CABLE driver pack...'
        Invoke-WebRequest -Uri 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip' -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $extract -Force
        $setup = Get-ChildItem -Path $extract -Recurse -Filter 'VBCABLE_Setup_x64.exe' | Select-Object -First 1
        if ($setup) {
            Write-Host '  Installing VB-CABLE (silent)...'
            Start-Process -FilePath $setup.FullName -ArgumentList '-i', '-h' -Wait
            Send-DeviceChangeNotification
            Start-Sleep -Seconds 3
            $cableEndpoints = @(Get-AudioEndpoints $captureBase | Where-Object { $_.Name -match 'CABLE|VB-Audio' })
        } else {
            Write-Host '  [ERROR] VBCABLE_Setup_x64.exe was not found in the downloaded archive.' -ForegroundColor Red
        }
    } else {
        Write-Host '  Skipped. RICHX MIC will not be available until a virtual audio cable is installed.' -ForegroundColor DarkYellow
    }
}

if ($alreadyNamed.Count -eq 0 -and $cableEndpoints.Count -gt 0) {
    foreach ($ep in $cableEndpoints) {
        Set-EndpointName $ep 'RICHX MIC'
        Write-Host "  Renamed '$($ep.Name)' -> 'RICHX MIC'" -ForegroundColor Green
    }
    Send-DeviceChangeNotification
}

# ============================== RICHX CAM ==============================
Write-Host ''
Write-Host '[2/2] RICHX CAM - Virtual camera device' -ForegroundColor Yellow

$cams        = @(Get-PnpDevice -Class CAMERA | Select-Object -ExpandProperty FriendlyName)
$virtualCams = @($cams | Where-Object { $_ -match 'OBS|Virtual|Camo|DroidCam|ManyCam|XSplit|NVIDIA Broadcast|IVCam' })

if ($virtualCams.Count -gt 0) {
    Write-Host '  Detected virtual camera driver(s) already installed:'
    $virtualCams | ForEach-Object { Write-Host "    - $_" }
    Write-Host '  RICH X CAM LIVE can send its generated video to any of these devices.' -ForegroundColor Green
} else {
    Write-Host '  No third-party virtual camera driver was detected.' -ForegroundColor DarkYellow
    Write-Host '  The native "RICHX CAM" virtual camera driver (no third-party software)'
    Write-Host '  ships in an upcoming update. Until then, start calls directly inside'
    Write-Host '  RICH X CAM LIVE and use its on-screen video output.'
}

# ============================== Summary ==============================
Write-Host ''
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  Installer finished' -ForegroundColor Cyan
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '  IMPORTANT: Restart your calling apps (WhatsApp, Zoom, Teams, Discord)'
Write-Host '  so the new devices appear in their Camera / Microphone lists.'
Write-Host ''
Read-Host 'Press Enter to close'
exit 0
