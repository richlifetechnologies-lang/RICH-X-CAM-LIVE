@echo off
setlocal
cd /d "%~dp0"

echo ========================================================================
echo   RICH X CAM LIVE - Unregister Virtual Camera Driver
echo ========================================================================
echo.

REM Verify Administrator Rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required.
    pause
    exit /b 1
)

if exist "richxcam64.dll" regsvr32.exe /s /u "richxcam64.dll"
if exist "UnityCaptureFilter64.dll" regsvr32.exe /s /u "UnityCaptureFilter64.dll"
if exist "richxcam32.dll" regsvr32.exe /s /u "richxcam32.dll"
if exist "UnityCaptureFilter32.dll" regsvr32.exe /s /u "UnityCaptureFilter32.dll"

echo [SUCCESS] "RICHX CAM" virtual camera driver unregistered.
echo.
