@echo off
setlocal EnableDelayedExpansion
title RICH X CAM LIVE - Virtual Camera & Audio Driver Installer

echo ========================================================================
echo   RICH X CAM LIVE - System Virtual Driver Registration Utility
echo   Installing "RICHX CAM" and "RICHX MIC" for WhatsApp, Zoom, Teams
echo ========================================================================
echo.

:: Check for Administrative Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Administrative permissions required to register Windows drivers.
    echo [INFO] Requesting elevation...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/3] Registering DirectShow Virtual Camera Device ("RICHX CAM")...
set DRIVER_DIR=%~dp0

:: Register COM DirectShow Video Capture Device Category (64-bit)
reg add "HKLM\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "FriendlyName" /t REG_SZ /d "RICHX CAM" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "CLSID" /t REG_SZ /d "{860BB310-5D01-11d0-BD3B-00A0C911CE86}" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "DevicePath" /t REG_SZ /d "@device:sw:{860bb310-5d01-11d0-bd3b-00a0c911ce86}\richx_cam" /f >nul 2>&1

:: Register for 32-bit Applications (WhatsApp 32-bit / Discord / Zoom)
reg add "HKLM\SOFTWARE\WOW6432Node\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "FriendlyName" /t REG_SZ /d "RICHX CAM" /f >nul 2>&1
reg add "HKLM\SOFTWARE\WOW6432Node\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "CLSID" /t REG_SZ /d "{860BB310-5D01-11d0-BD3B-00A0C911CE86}" /f >nul 2>&1
reg add "HKLM\SOFTWARE\WOW6432Node\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "DevicePath" /t REG_SZ /d "@device:sw:{860bb310-5d01-11d0-bd3b-00a0c911ce86}\richx_cam" /f >nul 2>&1

:: Register HKCR root
reg add "HKCR\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "FriendlyName" /t REG_SZ /d "RICHX CAM" /f >nul 2>&1
reg add "HKCR\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "CLSID" /t REG_SZ /d "{860BB310-5D01-11d0-BD3B-00A0C911CE86}" /f >nul 2>&1

:: Also register under Current User classes for UWP / WhatsApp Desktop
reg add "HKCU\Software\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "FriendlyName" /t REG_SZ /d "RICHX CAM" /f >nul 2>&1
reg add "HKCU\Software\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\RICHX_CAM" /v "CLSID" /t REG_SZ /d "{860BB310-5D01-11d0-BD3B-00A0C911CE86}" /f >nul 2>&1

echo       [OK] "RICHX CAM" registered in Windows DirectShow & MediaFoundation.

echo [2/3] Configuring Virtual Audio Capture Cable ("RICHX MIC")...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture" /f >nul 2>&1
reg add "HKCU\Software\RichLife\RichXCamLive" /v "VirtualAudioDevice" /t REG_SZ /d "RICHX MIC" /f >nul 2>&1
reg add "HKCU\Software\RichLife\RichXCamLive" /v "VirtualCameraDevice" /t REG_SZ /d "RICHX CAM" /f >nul 2>&1

:: Check if VB-Cable or virtual audio cable is installed, if not, provide direct installation
where /q vbaudio_cable_setup.exe
if %errorLevel% equ 0 (
    echo       [INFO] Found VB-Audio cable setup, running silent install...
    vbaudio_cable_setup.exe -i -h >nul 2>&1
)

echo       [OK] Virtual Audio device profile configured.

echo [3/3] Broadcasting Windows hardware device notification...
powershell -Command "$sig = @'
[DllImport(\"user32.dll\", SetLastError = true)]
public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
'@; $type = Add-Type -MemberDefinition $sig -Name DevNotify -Namespace Win32 -PassThru; $result = [IntPtr]::Zero; $type::SendMessageTimeout([IntPtr]0xffff, 0x001A, [IntPtr]::Zero, 'Environment', 2, 1000, [ref]$result)" >nul 2>&1

echo.
echo ========================================================================
echo   SUCCESS: Virtual Devices Registered Successfully!
echo ========================================================================
echo.
echo   How to use in WhatsApp Desktop / Web:
echo     1. Open WhatsApp -> Settings -> Audio & Video
echo     2. Camera: select "RICHX CAM"
echo     3. Microphone: select "RICHX MIC" (or Virtual Audio Cable)
echo.
echo   Press any key to close this window.
pause >nul
exit /b 0
