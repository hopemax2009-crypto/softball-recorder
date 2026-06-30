@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

set "PROJECT_DIR=D:\cursor_範例\壘球賽紀錄器"
cd /d "%PROJECT_DIR%"

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found. Install from https://git-scm.com/download/win
    pause
    exit /b 1
)

echo === 1. Init ===
if not exist ".git" git init -b main

echo === 2. Add files ===
git add .

echo === 3. Commit ===
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Initial commit: softball recorder web app"
    echo Commit done.
) else (
    echo No changes to commit.
)

echo.
echo === 4. Push ===
echo Create a private repo first: https://github.com/new
echo Repo name must match exactly on GitHub.
echo.

set /p GH_USER="GitHub username [hopemax2009]: "
if "!GH_USER!"=="" set "GH_USER=hopemax2009"

set /p GH_REPO="Repo name [softball-recorder]: "
if "!GH_REPO!"=="" set "GH_REPO=softball-recorder"

set "REMOTE=https://github.com/!GH_USER!/!GH_REPO!.git"
echo Remote: !REMOTE!

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin !REMOTE!
) else (
    git remote set-url origin !REMOTE!
)

echo Pushing to origin main...
git push -u origin main
if errorlevel 1 (
    echo.
    echo PUSH FAILED. Check:
    echo   - Repo exists at github.com/!GH_USER!/!GH_REPO!
    echo   - Name spelling is correct
    echo   - You completed browser login
    echo.
    echo Run scripts\push-to-github.bat to retry push only.
) else (
    echo.
    echo SUCCESS: https://!GH_USER!.github.io/!GH_REPO!/
    echo Enable Pages: Settings - Pages - GitHub Actions
)

echo.
pause
