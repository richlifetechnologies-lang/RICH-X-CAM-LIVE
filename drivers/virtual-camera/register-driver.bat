@echo off
REM Registers the RICHX CAM DirectShow Virtual Camera Filter on Windows
echo Registering RICHX CAM 64-bit Virtual Camera...
regsvr32 /s "%~dp0richxcam64.dll"
echo Registering RICHX CAM 32-bit Virtual Camera (for 32-bit calling apps)...
regsvr32 /s "%~dp0richxcam32.dll"
echo Done.
