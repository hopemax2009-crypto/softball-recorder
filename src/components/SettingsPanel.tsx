import { useRef, useState } from 'react';
import type { AuthSession, UserData } from '../types';
import type { CloudSyncState } from '../hooks/useAppData';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { adminResetAccountPassword, changeCredentials, isAdminUser, listAdminAccounts } from '../services/auth';
import type { AdminAccountView } from '../services/cloudAccount';
import { downloadJson, importData } from '../utils/storage';
import { Button, Card, Input } from './ui';
interface Props {
  session: AuthSession;
  data: UserData;
  cloudSync: CloudSyncState;
  onSyncToCloud: () => Promise<void>;
  onReplaceData: (data: UserData) => void;
  onSessionUpdate: (session: AuthSession) => void;
  onLogout: () => void;
}

export function SettingsPanel({ session, data, cloudSync, onSyncToCloud, onReplaceData, onSessionUpdate, onLogout }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const { updateAvailable, checking, clientBuildId, checkNow, reloadToLatest } = useAppUpdate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextUsername, setNextUsername] = useState(session.username);
  const [nextDisplayName, setNextDisplayName] = useState(session.displayName);
  const [nextPassword, setNextPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');
  const [accounts, setAccounts] = useState<AdminAccountView[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountListError, setAccountListError] = useState('');
  const [resetTargetUsername, setResetTargetUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  const isAdmin = isAdminUser(session.username);

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

  const handleUpdateCredentials = async () => {
    setAccountStatus('');
    if (!currentPassword) {
      setAccountStatus('請輸入目前密碼');
      return;
    }
    setSavingAccount(true);
    try {
      const nextSession = await changeCredentials(
        session,
        currentPassword,
        nextUsername,
        nextPassword || undefined,
        nextDisplayName
      );
      onSessionUpdate(nextSession);
      setCurrentPassword('');
      setNextPassword('');
      setAccountStatus('帳號資料已更新');
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleLoadAccounts = async () => {
    setAccountListError('');
    setLoadingAccounts(true);
    try {
      const rows = await listAdminAccounts(session.username);
      setAccounts(rows);
    } catch (err) {
      setAccountListError(err instanceof Error ? err.message : '載入帳號失敗');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleResetUserPassword = async () => {
    setResetStatus('');
    if (!resetTargetUsername.trim()) {
      setResetStatus('請先輸入要重設的帳號');
      return;
    }
    if (!resetNewPassword.trim()) {
      setResetStatus('請輸入新密碼');
      return;
    }
    setResettingPassword(true);
    try {
      await adminResetAccountPassword(session.username, resetTargetUsername, resetNewPassword);
      setResetStatus(`已重設 ${resetTargetUsername.trim().toLowerCase()} 的密碼`);
      setResetNewPassword('');
    } catch (err) {
      setResetStatus(err instanceof Error ? err.message : '重設密碼失敗');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <h3 className="font-semibold mb-2">使用者資訊</h3>
        <p className="text-sm text-gray-600">
          {session.displayName}（帳號：{session.username}）
        </p>
        <p className="text-xs text-gray-400 mt-1">
          最後更新：{new Date(data.updatedAt).toLocaleString('zh-TW')}
        </p>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">帳號與密碼</h3>
        <Input
          label="目前密碼（必填）"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="新帳號"
          value={nextUsername}
          onChange={(e) => setNextUsername(e.target.value)}
          autoComplete="username"
        />
        <Input
          label="新顯示名稱"
          value={nextDisplayName}
          onChange={(e) => setNextDisplayName(e.target.value)}
        />
        <Input
          label="新密碼（留空代表不更改）"
          type="password"
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
          autoComplete="new-password"
        />
        {accountStatus && (
          <p className={`text-xs rounded-lg py-2 px-2 ${accountStatus.includes('已更新') ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {accountStatus}
          </p>
        )}
        <Button onClick={() => void handleUpdateCredentials()} disabled={savingAccount} className="w-full">
          {savingAccount ? '更新中…' : '更新帳號資料'}
        </Button>
      </Card>

      {isAdmin && (
        <Card className="space-y-3 bg-purple-50 border-purple-200">
          <h3 className="font-semibold text-purple-900">管理者：帳號清單</h3>
          <p className="text-xs text-purple-800">
            因安全設計無法還原密碼明碼，以下顯示密碼雜湊（Hash）。
          </p>
          <div className="rounded-lg border border-purple-200 bg-white p-3 space-y-2">
            <p className="text-xs font-medium text-purple-900">重設他人密碼</p>
            <Input
              label="目標帳號"
              placeholder="輸入要重設的帳號"
              value={resetTargetUsername}
              onChange={(e) => setResetTargetUsername(e.target.value)}
            />
            <Input
              label="新密碼（至少 4 碼）"
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
            />
            {resetStatus && (
              <p className={`text-xs rounded-lg py-2 px-2 ${resetStatus.includes('已重設') ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                {resetStatus}
              </p>
            )}
            <Button onClick={() => void handleResetUserPassword()} disabled={resettingPassword} className="w-full">
              {resettingPassword ? '重設中…' : '重設密碼'}
            </Button>
          </div>
          <Button variant="secondary" onClick={() => void handleLoadAccounts()} disabled={loadingAccounts} className="w-full">
            {loadingAccounts ? '載入中…' : '載入所有帳號'}
          </Button>
          {accountListError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg py-2 px-2">{accountListError}</p>
          )}
          {accounts.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.map((a) => (
                <div key={a.username} className="bg-white rounded-lg border border-purple-100 p-2">
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">帳號：</span>
                    <button
                      type="button"
                      onClick={() => setResetTargetUsername(a.username)}
                      className="text-field-green underline underline-offset-2"
                    >
                      {a.username}
                    </button>
                  </p>
                  <p className="text-xs text-gray-700"><span className="font-medium">名稱：</span>{a.displayName}</p>
                  <p className="text-xs text-gray-500 break-all"><span className="font-medium">密碼雜湊：</span>{a.passwordHash}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className={`space-y-3 ${updateAvailable ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className="font-semibold text-gray-900">應用程式更新</h3>
        <p className="text-xs text-gray-600">
          若主畫面捷徑仍顯示舊版，可點下方按鈕強制載入最新版（會清除網頁快取並重新整理）。
        </p>
        <p className="text-[10px] text-gray-400">
          目前版本：{clientBuildId}
          {checking ? ' · 檢查中…' : updateAvailable ? ' · 有新版本' : ' · 已是最新'}
        </p>
        {updateAvailable && (
          <p className="text-xs text-amber-800 bg-amber-100/80 rounded-lg py-2 px-2">
            偵測到伺服器已發布新版本，建議立即更新。
          </p>
        )}
        <div className="flex gap-2">
          <Button
            onClick={() => void reloadToLatest()}
            className="flex-1 !py-2.5"
          >
            更新最新版
          </Button>
          <Button
            variant="secondary"
            onClick={() => void checkNow()}
            disabled={checking}
            className="flex-1 !py-2.5"
          >
            {checking ? '檢查中…' : '檢查更新'}
          </Button>
        </div>
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
