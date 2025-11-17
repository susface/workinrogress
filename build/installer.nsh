; Custom NSIS installer script for CoverFlow Game Launcher
; This script checks for required dependencies before installation

!macro customInstall
  ; Check for Python installation
  DetailPrint "Checking for Python installation..."

  ; Try to find Python in PATH
  nsExec::ExecToStack 'python --version'
  Pop $0 ; return code
  Pop $1 ; output

  ${If} $0 != 0
    ; Python not found in PATH, try python3
    nsExec::ExecToStack 'python3 --version'
    Pop $0
    Pop $1

    ${If} $0 != 0
      ; Python still not found, show warning
      MessageBox MB_ICONEXCLAMATION|MB_YESNO "Python was not detected on your system.$\r$\n$\r$\nCoverFlow Game Launcher requires Python 3.7 or higher to scan for games.$\r$\n$\r$\nThe application will still install, but game scanning features will not work until Python is installed.$\r$\n$\r$\nDo you want to continue with the installation?" IDYES continueInstall
      Abort "Installation cancelled by user."
      continueInstall:
    ${Else}
      DetailPrint "Python found: $1"
    ${EndIf}
  ${Else}
    DetailPrint "Python found: $1"
  ${EndIf}

  ; Create application data directory
  CreateDirectory "$APPDATA\CoverFlow Game Launcher"
!macroend

!macro customUnInstall
  ; Clean up application data
  DetailPrint "Cleaning up application data..."
  MessageBox MB_ICONQUESTION|MB_YESNO "Do you want to remove all saved data (game library, settings, etc.)?" IDYES removeData IDNO skipRemove
  removeData:
    RMDir /r "$APPDATA\CoverFlow Game Launcher"
    DetailPrint "Application data removed"
    Goto done
  skipRemove:
    DetailPrint "Application data preserved"
  done:
!macroend
