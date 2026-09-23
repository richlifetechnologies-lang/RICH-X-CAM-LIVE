@echo off
REM Installs the RICHX Audio Virtual Cable Driver silently into Windows Device Manager
echo Installing RICHX Audio Virtual Cable Driver...
"%~dp0VBCABLE_Setup_x64.exe" -i -h
echo RICHX Audio Driver Installed.
