import { useState } from 'react';
import type { AuthSession } from '../types';
import { canUseRegisterForUsername, createAccount } from '../services/auth';
import { Button, Card, EmptyState, Input } from './ui';

interface Props {
  session: AuthSession;
}

export function RegisterPanel({ session }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const canRegister = canUseRegisterForUsername(session.username);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegister) return;
    setStatus('');
    setLoading(true);
    try {
      await createAccount(session.username, username, password, displayName);
      setStatus(`已建立帳號：${username.trim().toLowerCase()}`);
      setUsername('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '建立帳號失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!canRegister) {
    return (
      <div className="p-4">
        <Card>
          <EmptyState
            icon="🔒"
            title="沒有註冊權限"
            description="此帳號僅可登入與使用系統，如需註冊權限請洽管理者"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="space-y-3">
        <h3 className="font-semibold">建立新帳號</h3>
        <p className="text-xs text-gray-500">
          由有權限帳號代為建立，建立後對方可自行登入與修改帳密。
        </p>
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="新帳號"
            placeholder="英數字與底線，3-20 字"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="初始密碼"
            type="password"
            placeholder="至少 4 碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="顯示名稱（選填）"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {status && (
            <p className={`text-xs rounded-lg py-2 px-2 ${status.startsWith('已建立') ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
              {status}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '建立中…' : '建立帳號'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
