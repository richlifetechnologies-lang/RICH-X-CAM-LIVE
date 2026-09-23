; RICH X CAM LIVE - Automated Driver Installer Script (NSIS)
; Bundles DirectShow Virtual Camera ("RICHX CAM") and Virtual Audio Bridge ("RICHX MIC")

!macro customInstall
  DetailPrint "Installing RICHX CAM Virtual Camera Driver..."
  ExecWait '"$INSTDIR\resources\drivers\virtual-camera\register-driver.bat" /S'
  
  DetailPrint "Installing RICHX MIC Audio Bridge Driver..."
  ExecWait '"$INSTDIR\resources\drivers\virtual-audio\install-audio-driver.bat" /S'
  
  DetailPrint "RICH X CAM LIVE virtual devices registered successfully."
!macroend

!macro customUnInstall
  DetailPrint "Unregistering RICHX CAM devices..."
  ExecWait '"$INSTDIR\resources\drivers\virtual-camera\unregister-driver.bat" /S'
!macroend
