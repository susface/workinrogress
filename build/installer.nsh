; Custom NSIS installer script for CoverFlow Game Launcher
; This script checks for and installs Python if needed

!include "LogicLib.nsh"
!include "x64.nsh"

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
      ; Python not found - offer to install it
      MessageBox MB_ICONEXCLAMATION|MB_YESNOCANCEL "Python was not detected on your system.$\r$\n$\r$\nCoverFlow Game Launcher requires Python 3.7 or higher to scan for games.$\r$\n$\r$\nWould you like to automatically download and install Python 3.11?$\r$\n$\r$\nYes = Download and install Python automatically$\r$\nNo = Skip Python installation (you can install it manually later)$\r$\nCancel = Abort the installation" IDYES installPython IDNO skipPython
      Abort "Installation cancelled by user."

      installPython:
        DetailPrint "Downloading Python 3.11 installer..."

        ; Determine architecture
        ${If} ${RunningX64}
          StrCpy $2 "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        ${Else}
          StrCpy $2 "https://www.python.org/ftp/python/3.11.9/python-3.11.9.exe"
        ${EndIf}

        ; Download Python installer to temp directory
        inetc::get /CAPTION "Downloading Python..." /CANCELTEXT "Cancel" $2 "$TEMP\python-installer.exe" /END
        Pop $0 ; return value

        ${If} $0 == "OK"
          DetailPrint "Python downloaded successfully"
          DetailPrint "Installing Python... This may take a few minutes..."

          ; Run Python installer silently with "Add to PATH" option
          ; /quiet = silent install
          ; InstallAllUsers=0 = install for current user only (no admin)
          ; PrependPath=1 = add Python to PATH
          ; Include_test=0 = don't install test suite (saves space)
          nsExec::ExecToLog '"$TEMP\python-installer.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0'
          Pop $0

          ${If} $0 == 0
            DetailPrint "Python installed successfully!"
            MessageBox MB_ICONINFORMATION "Python 3.11 has been installed successfully.$\r$\n$\r$\nContinuing with CoverFlow Game Launcher installation..."

            ; Clean up installer
            Delete "$TEMP\python-installer.exe"
          ${Else}
            DetailPrint "Python installation failed (error code: $0)"
            MessageBox MB_ICONEXCLAMATION "Python installation failed.$\r$\n$\r$\nYou may need to install Python manually from https://www.python.org/$\r$\n$\r$\nContinuing with CoverFlow Game Launcher installation..."
            Delete "$TEMP\python-installer.exe"
          ${EndIf}
        ${Else}
          DetailPrint "Python download failed: $0"
          MessageBox MB_ICONEXCLAMATION "Failed to download Python installer.$\r$\n$\r$\nPlease install Python manually from https://www.python.org/$\r$\n$\r$\nContinuing with CoverFlow Game Launcher installation..."
        ${EndIf}
        Goto pythonCheckDone

      skipPython:
        DetailPrint "Skipping Python installation"
        MessageBox MB_ICONINFORMATION "Python installation skipped.$\r$\n$\r$\nRemember to install Python 3.7+ from https://www.python.org/ to use game scanning features.$\r$\n$\r$\nContinuing with installation..."
        Goto pythonCheckDone

      pythonCheckDone:
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
