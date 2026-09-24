!macro customInit
  ; Stop the main Electron process and its bundled API child before NSIS replaces files.
  nsExec::Exec 'taskkill /F /T /IM "RICH X CAM LIVE.exe"'
  nsExec::Exec 'taskkill /F /T /IM "rich-x-cam-live.exe"'
  Sleep 1500
  ; A second pass handles a child process that was still shutting down.
  nsExec::Exec 'taskkill /F /T /IM "RICH X CAM LIVE.exe"'
  nsExec::Exec 'taskkill /F /T /IM "rich-x-cam-live.exe"'
  Sleep 2500
!macroend

!macro customUnInstall
  nsExec::Exec 'taskkill /F /T /IM "RICH X CAM LIVE.exe"'
  nsExec::Exec 'taskkill /F /T /IM "rich-x-cam-live.exe"'
  Sleep 2000
!macroend
