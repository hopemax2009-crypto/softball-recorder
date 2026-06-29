@echo off
chcp 65001 >nul
cd /d "D:\cursor_範例\壘球賽紀錄器"

set "PATH=D:\cursor_範例\node-v24.18.0-win-x64;%PATH%"

echo 啟動開發伺服器...
echo 瀏覽器開啟 http://localhost:5173
echo 按 Ctrl+C 停止
npm run dev
