@echo off
chcp 65001 >nul
setlocal

set "NODE_DIR=D:\cursor_範例\node-v24.18.0-win-x64"
set "PROJECT_DIR=D:\cursor_範例\壘球賽紀錄器"

cd /d "%PROJECT_DIR%"

where git >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Git，請先安裝：
    echo   https://git-scm.com/download/win
    echo 安裝時請勾選 "Add Git to PATH"
    pause
    exit /b 1
)

echo === 1. 初始化 Git 儲存庫 ===
if not exist ".git" (
    git init -b main
) else (
    echo 已是 Git 儲存庫，略過 init
)

echo.
echo === 2. 加入檔案 ===
git add .
git status

echo.
echo === 3. 建立第一次 commit ===
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Initial commit: 壘球賽紀錄器網頁應用" -m "- React + Vite 手機友善打擊紀錄介面" -m "- 賽季/累計成績統計" -m "- GitHub 雲端同步與 GitHub Pages 部署"
    echo Commit 完成！
) else (
    echo 沒有待提交的變更
)

echo.
echo === 4. 推送到 GitHub ===
echo 請先在 https://github.com/new 建立私人儲存庫
echo 建立後輸入您的 GitHub 使用者名稱與儲存庫名稱：
echo.

set /p GH_USER="GitHub 使用者名稱: "
set /p GH_REPO="儲存庫名稱 (例: softball-recorder): "

if "%GH_USER%"=="" goto :skip_push
if "%GH_REPO%"=="" goto :skip_push

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/%GH_USER%/%GH_REPO%.git
) else (
    git remote set-url origin https://github.com/%GH_USER%/%GH_REPO%.git
)

echo.
echo 正在推送到 origin main ...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [提示] 若推送失敗，可能原因：
    echo   1. 尚未在 GitHub 建立儲存庫
    echo   2. 需要登入 GitHub（會跳出瀏覽器或要求輸入 Token）
    echo   3. 可改用手動：git push -u origin main
) else (
    echo.
    echo 推送成功！
    echo 請到 GitHub 儲存庫 Settings ^> Pages ^> Source 選擇 "GitHub Actions"
    echo 網址將為：https://%GH_USER%.github.io/%GH_REPO%/
)

:skip_push
echo.
pause
