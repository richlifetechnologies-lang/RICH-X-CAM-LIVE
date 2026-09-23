@echo off
setlocal
title RICH X CAM LIVE - Remove Virtual Devices

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-RichXVirtualDevices.ps1" -Uninstall
echo.
pause
