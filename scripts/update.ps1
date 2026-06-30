# UTF-8 with BOM
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectDir = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectDir

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $candidates = @(
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files (x86)\Git\cmd\git.exe',
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) {
            $env:PATH = "$(Split-Path $p);$env:PATH"
            break
        }
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host '[錯誤] 找不到 Git' -ForegroundColor Red
    Read-Host '按 Enter 結束'
    exit 1
}

Write-Host '=== 壘球賽紀錄器 - 更新上傳 ===' -ForegroundColor Cyan
Write-Host ''

git status
Write-Host ''

$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host '沒有變更，無需上傳。' -ForegroundColor Yellow
    Read-Host '按 Enter 結束'
    exit 0
}

Write-Host '請輸入這次更新說明：' -ForegroundColor Cyan
$msg = Read-Host 'commit 訊息'
if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = '更新壘球賽紀錄器'
}

Write-Host ''
Write-Host '正在提交...' -ForegroundColor Cyan
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m $msg

if ($LASTEXITCODE -ne 0) {
    Write-Host '提交失敗' -ForegroundColor Red
    Read-Host '按 Enter 結束'
    exit 1
}

Write-Host ''
Write-Host '正在推送到 GitHub...' -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ''
    Write-Host '上傳成功！GitHub Actions 會自動部署新版本。' -ForegroundColor Green
    Write-Host '查看進度: https://github.com/hopemax2009-crypto/softball-recorder/actions'
} else {
    Write-Host ''
    Write-Host '推送失敗，請檢查網路或登入狀態。' -ForegroundColor Red
}

Write-Host ''
Read-Host '按 Enter 結束'