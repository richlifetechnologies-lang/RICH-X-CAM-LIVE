@echo off
setlocal
cd /d "%~dp0"

echo ========================================================================
echo   RICH X CAM LIVE - DirectShow Virtual Camera Driver Registration
echo   Registers the native "RICHX CAM" virtual video capture device
echo ========================================================================
echo.

REM Verify Administrator Rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required.
    echo Right-click this file and select "Run as administrator".
    pause
    exit /b 1
)

REM Register 64-bit DirectShow Filter as "RICHX CAM"
if exist "richxcam64.dll" (
    echo Registering 64-bit RICHX CAM filter (richxcam64.dll)...
    regsvr32.exe /s /i:"UnityCaptureName=RICHX CAM" "richxcam64.dll"
) else if exist "UnityCaptureFilter64.dll" (
    echo Registering 64-bit RICHX CAM filter (UnityCaptureFilter64.dll)...
    regsvr32.exe /s /i:"UnityCaptureName=RICHX CAM" "UnityCaptureFilter64.dll"
)

REM Register 32-bit DirectShow Filter as "RICHX CAM" for 32-bit apps
if exist "richxcam32.dll" (
    echo Registering 32-bit RICHX CAM filter (richxcam32.dll)...
    regsvr32.exe /s /i:"UnityCaptureName=RICHX CAM" "richxcam32.dll"
) else if exist "UnityCaptureFilter32.dll" (
    echo Registering 32-bit RICHX CAM filter (UnityCaptureFilter32.dll)...
    regsvr32.exe /s /i:"UnityCaptureName=RICHX CAM" "UnityCaptureFilter32.dll"
)

echo.
echo [SUCCESS] "RICHX CAM" virtual camera filter registered successfully!
echo "RICHX CAM" will now appear in WhatsApp, Zoom, Microsoft Teams, Discord, Skype, and browsers.
echo.
