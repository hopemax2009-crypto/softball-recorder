# 壘球賽紀錄器 ⚾

個人化壘球打擊紀錄網頁應用，支援手機操作、賽季/累計統計，以及 GitHub 雲端同步。

## 功能

- **打擊紀錄**：大按鈕快速紀錄打席結果（安打、保送、三振等）
- **個人化管理**：每位使用者擁有獨立的球員、賽季、比賽資料
- **成績統計**：支援單一賽季與累計打擊率、上壘率、長打率、OPS
- **雲端同步**：透過 GitHub API 將資料儲存至私人儲存庫
- **手機友善**：底部導覽、大觸控按鈕、響應式版面

## 線上使用

1. 將此專案設為 **私人儲存庫**
2. 僅邀請需要使用的成員為協作者
3. 啟用 GitHub Pages（Settings → Pages → Source: GitHub Actions）
4. 推送至 `main` 分支後自動部署

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:5173

## GitHub 雲端同步設定

1. 前往 GitHub → Settings → Developer settings → Personal access tokens
2. 建立 Fine-grained token 或 Classic token，勾選 `repo` 權限
3. 在 App「設定」頁面填入：
   - **Token**：您的 PAT
   - **擁有者**：GitHub 使用者名稱或組織
   - **儲存庫**：此專案儲存庫名稱
   - **分支**：`main`

資料會儲存於 `data/{您的ID}/records.json`

### 同步方式

| 按鈕 | 說明 |
|------|------|
| 自動同步 | 比較本機與雲端時間戳，自動上傳或下載較新者 |
| 上傳 | 強制將本機資料上傳至 GitHub |
| 下載 | 強制從 GitHub 下載資料 |

## 部署注意事項

若儲存庫名稱不是 `softball-recorder`，請修改 `vite.config.ts` 中的 `base` 路徑：

```ts
base: '/您的儲存庫名稱/',
```

## 資料備份

- 本機資料儲存於瀏覽器 localStorage
- 可透過「匯出 JSON」手動備份
- 建議定期使用 GitHub 同步

## 技術棧

- React 18 + TypeScript
- Vite
- Tailwind CSS
- GitHub Contents API

## 授權

MIT
