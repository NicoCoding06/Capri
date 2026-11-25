@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "LOG=%~dp0installazione.txt"
echo Capri Musica - installazione %date% %time% > "%LOG%"
set "PYEXE="
for /f "delims=" %%i in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PYEXE=%%i"
if not defined PYEXE for %%p in ("%LOCALAPPDATA%\Programs\Python\Python313\python.exe" "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%USERPROFILE%\anaconda3\python.exe" "%USERPROFILE%\miniconda3\python.exe" "%LOCALAPPDATA%\anaconda3\python.exe" "%LOCALAPPDATA%\miniconda3\python.exe" "%ProgramData%\anaconda3\python.exe" "%ProgramData%\miniconda3\python.exe") do if not defined PYEXE if exist %%p set "PYEXE=%%~p"
if not defined PYEXE (
  echo Python non trovato: lo installo con winget >> "%LOG%"
  winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements >> "%LOG%" 2>&1
  if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
)
if not defined PYEXE (
  echo ERRORE: Python non disponibile >> "%LOG%"
  exit /b 1
)
echo Python: %PYEXE% >> "%LOG%"
"%PYEXE%" --version >> "%LOG%" 2>&1
set "PYW=%PYEXE:python.exe=pythonw.exe%"
if not exist "%PYW%" set "PYW=%PYEXE%"
echo Brani nella cartella Musica: >> "%LOG%"
dir /s /b "%USERPROFILE%\Music\*.mp3" "%USERPROFILE%\Music\*.m4a" "%USERPROFILE%\Music\*.flac" "%USERPROFILE%\Music\*.wav" "%USERPROFILE%\Music\*.ogg" 2>nul | find /c /v "" >> "%LOG%"
if exist "%USERPROFILE%\OneDrive\Music" (
  echo Brani in OneDrive\Music: >> "%LOG%"
  dir /s /b "%USERPROFILE%\OneDrive\Music\*.mp3" "%USERPROFILE%\OneDrive\Music\*.m4a" "%USERPROFILE%\OneDrive\Music\*.flac" 2>nul | find /c /v "" >> "%LOG%"
)
start "" "%PYW%" "%~dp0capri-musica.py" --cartella "%USERPROFILE%\Music" --imposta-avvio --avvio
echo Avviato con %PYW% >> "%LOG%"
timeout /t 60 /nobreak >nul
copy /y "%LOCALAPPDATA%\CapriMusica\registro.txt" "%~dp0registro-copia.txt" >nul 2>&1
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Capri Musica.vbs" (echo Avvio automatico: impostato >> "%LOG%") else (echo Avvio automatico: NON impostato >> "%LOG%")
echo Fine >> "%LOG%"
