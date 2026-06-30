import { useRef, useState } from 'react';
import type { UserData } from '../types';
import type { CloudSyncState } from '../hooks/useAppData';
import { downloadJson, importData } from '../utils/storage';
import { Button, Card } from './ui';

interface Props {
  data: UserData;
  cloudSync: CloudSyncState;
  onSyncToCloud: () => Promise<void>;
  onReplaceData: (data: UserData) => void;
  onLogout: () => void;
}

export function SettingsPanel({ data, cloudSync, onSyncToCloud, onReplaceData, onLogout }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importData(reader.result as string);
        onReplaceData(imported);
        setStatus('已匯入資料');
      } catch {
        setStatus('匯入失敗：檔案格式錯誤');
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
          {data.ownerName}（帳號：{data.ownerId}）
        </p>
        <p className="text-xs text-gray-400 mt-1">
          最後更新：{new Date(data.updatedAt).toLocaleString('zh-TW')}
        </p>
      </Card>

      <Card className="space-y-3 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900">雲端存檔</h3>
        <p className="text-xs text-blue-800">
          資料已同步至雲端，在其他裝置用相同帳號登入即可取回。
        </p>
        <p className="text-xs text-blue-700">
          {cloudSync.syncing
            ? '正在同步...'
            : cloudSync.lastSync
              ? `上次同步：${cloudSync.lastSync.toLocaleString('zh-TW')}`
              : '尚未同步'}
        </p>
        {cloudSync.error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg py-2 px-2">{cloudSync.error}</p>
        )}
        <Button variant="secondary" onClick={() => void onSyncToCloud()} disabled={cloudSync.syncing} className="w-full">
          立即同步到雲端
        </Button>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">本機備份</h3>
        <p className="text-xs text-gray-500">匯出或匯入 JSON 檔案，作為額外備份用途。</p>
        <Button variant="secondary" onClick={() => downloadJson(data)} className="w-full">
          匯出 JSON 檔案
        </Button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
          匯入 JSON 檔案
        </Button>
      </Card>

      {status && (
        <p className="text-sm text-center text-field-green bg-green-50 rounded-xl py-2 px-3">
          {status}
        </p>
      )}

      <Card>
        <button
          onClick={() => {
            if (confirm('確定要登出？')) onLogout();
          }}
          className="text-red-500 text-sm w-full text-center py-1"
        >
          登出
        </button>
      </Card>
    </div>
  );
}
