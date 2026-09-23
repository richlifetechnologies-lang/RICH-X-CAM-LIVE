!macro customInit
  ; Force close any lingering processes before file extraction
  nsExec::Exec 'taskkill /F /IM "RICH X CAM LIVE.exe" /T'
  nsExec::Exec 'taskkill /F /IM "rich-x-cam-live.exe" /T'
  Sleep 500
!macroend

!macro customUnInstall
  nsExec::Exec 'taskkill /F /IM "RICH X CAM LIVE.exe" /T'
  nsExec::Exec 'taskkill /F /IM "rich-x-cam-live.exe" /T'
!macroend
