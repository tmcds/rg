@echo off
setlocal enabledelayedexpansion


cd /d "C:\GymManager"

REM ── Build the commit message with current date & time ──
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set DAY=%%a
    set MONTH=%%b
    set YEAR=%%c
)
for /f "tokens=1-2 delims=:." %%a in ('echo %time%') do (
    set HH=%%a
    set MM=%%b
)

set COMMIT_MSG=Backup data.json - %YEAR%-%MONTH%-%DAY% %HH%:%MM%

echo.
echo ========================================
echo   Gym Manager - Data Backup
echo ========================================
echo.
echo Commit message: !COMMIT_MSG!
echo.

REM ── Check git is available ──
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    echo Install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)

REM ── Check we're inside a git repo ──
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Not inside a git repository.
    echo Run "git init" in C:\GymManager first.
    pause
    exit /b 1
)

REM ── Stage ONLY data.json ──
git add data.json
if errorlevel 1 (
    echo [ERROR] Failed to stage data.json.
    pause
    exit /b 1
)

REM ── Check if there's anything to commit ──
git diff --cached --quiet
if not errorlevel 1 (
    echo [INFO] No changes in data.json. Nothing to commit.
    pause
    exit /b 0
)

REM ── Commit ──
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo [ERROR] Commit failed.
    pause
    exit /b 1
)

echo.
echo [OK] Backup committed successfully.
echo.

REM ── Optional: uncomment to auto-push to remote ──
REM git push
REM if errorlevel 1 (
REM     echo [WARN] Push failed. Commit is saved locally.
REM )

echo Done.
timeout /t 3 >nul
endlocal