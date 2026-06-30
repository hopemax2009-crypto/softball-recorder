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
    Write-Host '[錯誤] 找不到 Git，請先安裝 https://git-scm.com/download/win' -ForegroundColor Red
    Read-Host '按 Enter 結束'
    exit 1
}

Write-Host '=== Git 狀態 ===' -ForegroundColor Cyan
git status

Write-Host ''
Write-Host '=== 設定遠端並推送 ===' -ForegroundColor Cyan
Write-Host '請確認已在 GitHub 建立私人儲存庫：'
Write-Host '  https://github.com/new'
Write-Host ''
Write-Host '注意：儲存庫名稱必須與 GitHub 上完全一致，區分大小寫'
Write-Host ''

$defaultUser = 'hopemax2009'
$defaultRepo = 'softball-recorder'

$ghUser = Read-Host "GitHub 使用者名稱 [$defaultUser]"
if ([string]::IsNullOrWhiteSpace($ghUser)) { $ghUser = $defaultUser }

$ghRepo = Read-Host "儲存庫名稱 [$defaultRepo]"
if ([string]::IsNullOrWhiteSpace($ghRepo)) { $ghRepo = $defaultRepo }

$remoteUrl = "https://github.com/$ghUser/$ghRepo.git"
Write-Host ''
Write-Host "遠端網址: $remoteUrl" -ForegroundColor Yellow

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remoteUrl
} else {
    git remote set-url origin $remoteUrl
}

Write-Host ''
Write-Host '正在推送，若跳出瀏覽器請完成登入...' -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ''
    Write-Host '推送成功！' -ForegroundColor Green
    Write-Host '請到 GitHub 儲存庫 Settings > Pages > Source 選 GitHub Actions'
    Write-Host "網站網址: https://$ghUser.github.io/$ghRepo/"
} else {
    Write-Host ''
    Write-Host '推送失敗，常見原因：' -ForegroundColor Red
    Write-Host "  1. GitHub 上尚未建立名為 $ghRepo 的儲存庫"
    Write-Host "  2. 儲存庫名稱打錯，請到 github.com/$ghUser 確認正確名稱"
    Write-Host '  3. 該帳號沒有此儲存庫的寫入權限'
    Write-Host ''
    Write-Host '建立儲存庫後再執行一次此腳本即可'
}

Write-Host ''
Read-Host '按 Enter 結束'