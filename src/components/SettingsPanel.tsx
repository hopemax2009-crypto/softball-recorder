import { useRef, useState } from 'react';
import type { UserData } from '../types';
import {
  loadGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  verifyGitHubToken,
  syncWithGitHub,
  pushToGitHub,
  pullFromGitHub,
} from '../services/github';
import { downloadJson, importData } from '../utils/storage';
import { Button, Card, Input } from './ui';

interface Props {
  data: UserData;
  onReplaceData: (data: UserData) => void;
  onResetOwner: () => void;
}

export function SettingsPanel({ data, onReplaceData, onResetOwner }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const existingConfig = loadGitHubConfig();

  const [token, setToken] = useState(existingConfig?.token ?? '');
  const [owner, setOwner] = useState(existingConfig?.owner ?? '');
  const [repo, setRepo] = useState(existingConfig?.repo ?? '');
  const [branch, setBranch] = useState(existingConfig?.branch ?? 'main');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSaveConfig = async () => {
    if (!token || !owner || !repo) {
      setSyncStatus('請填寫完整 GitHub 設定');
      return;
    }
    try {
      await verifyGitHubToken({ token, owner, repo, branch });
      saveGitHubConfig({ token, owner, repo, branch });
      setSyncStatus('GitHub 設定已儲存 ✓');
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : '驗證失敗');
    }
  };

  const handleSync = async () => {
    const config = loadGitHubConfig();
    if (!config) {
      setSyncStatus('請先儲存 GitHub 設定');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncWithGitHub(config, data);
      onReplaceData(result.data);
      const messages = { pushed: '已上傳至 GitHub', pulled: '已從 GitHub 下載', merged: '資料已同步' };
      setSyncStatus(messages[result.action]);
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : '同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    const config = loadGitHubConfig();
    if (!config) return;
    setSyncing(true);
    try {
      await pushToGitHub(config, data);
      setSyncStatus('已強制上傳至 GitHub');
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    const config = loadGitHubConfig();
    if (!config) return;
    setSyncing(true);
    try {
      const remote = await pullFromGitHub(config, data.ownerId);
      if (remote) {
        onReplaceData(remote);
        setSyncStatus('已從 GitHub 下載');
      } else {
        setSyncStatus('雲端尚無資料');
      }
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : '下載失敗');
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importData(reader.result as string);
        onReplaceData(imported);
        setSyncStatus('已匯入資料');
      } catch {
        setSyncStatus('匯入失敗：檔案格式錯誤');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <h3 className="font-semibold mb-2">使用者資訊</h3>
        <p className="text-sm text-gray-600">
          {data.ownerName}（ID: {data.ownerId}）
        </p>
        <p className="text-xs text-gray-400 mt-1">
          最後更新：{new Date(data.updatedAt).toLocaleString('zh-TW')}
        </p>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">GitHub 雲端同步</h3>
        <p className="text-xs text-gray-500">
          使用 Personal Access Token 將資料儲存至 GitHub 私人儲存庫。
          僅有儲存庫協作者可存取。
        </p>
        <Input
          label="GitHub Token"
          type="password"
          placeholder="ghp_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Input
          label="擁有者 (owner)"
          placeholder="username 或 org"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Input
          label="儲存庫名稱"
          placeholder="softball-recorder"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <Input
          label="分支"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleSaveConfig} className="flex-1 min-w-[120px]">儲存設定</Button>
          <Button onClick={handleSync} disabled={syncing} className="flex-1 min-w-[120px]">
            {syncing ? '同步中...' : '自動同步'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePush} disabled={syncing} className="flex-1">
            上傳
          </Button>
          <Button variant="secondary" onClick={handlePull} disabled={syncing} className="flex-1">
            下載
          </Button>
        </div>
        {existingConfig && (
          <button
            onClick={() => {
              clearGitHubConfig();
              setToken('');
              setSyncStatus('已清除 GitHub 設定');
            }}
            className="text-red-400 text-sm"
          >
            清除 GitHub 設定
          </button>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">本機備份</h3>
        <Button variant="secondary" onClick={() => downloadJson(data)} className="w-full">
          匯出 JSON 檔案
        </Button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
          匯入 JSON 檔案
        </Button>
      </Card>

      {syncStatus && (
        <p className="text-sm text-center text-field-green bg-green-50 rounded-xl py-2 px-3">
          {syncStatus}
        </p>
      )}

      <Card>
        <button
          onClick={() => {
            if (confirm('確定要重設使用者？本機資料將被清除。')) {
              localStorage.clear();
              onResetOwner();
            }
          }}
          className="text-red-500 text-sm w-full text-center"
        >
          重設使用者
        </button>
      </Card>
    </div>
  );
}
