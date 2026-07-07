import { useState } from 'react';
import type { AuthSession } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { login, getLastUsername } from '../services/auth';
import { Button, Card, EmptyState, Input } from './ui';

interface Props {
  onAuth: (session: AuthSession) => void;
}

export function Login({ onAuth }: Props) {
  const [username, setUsername] = useState(() => getLastUsername());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await login(username, password);
      onAuth(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-field-green to-field-light">
        <Card className="w-full max-w-md">
          <EmptyState
            icon="☁️"
            title="雲端尚未設定"
            description="管理者需設定 Firebase 雲端資料庫並重新部署，才能註冊帳號"
          />
        </Card>
      </div>
    );
  }

  return (    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-field-green to-field-light">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">⚾</div>
          <h1 className="text-2xl font-bold text-field-green">壘球賽紀錄器</h1>
          <p className="text-gray-500 mt-2 text-sm">請輸入帳密登入；註冊由登入後「註冊」分頁操作</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="帳號"
            placeholder="英數字帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoFocus={!username}
          />
          <Input
            label="密碼"
            type="password"
            placeholder="至少 4 碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '處理中...' : '登入'}
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          帳號存於雲端；換裝置輸入帳密即可取回資料
        </p>
      </Card>
    </div>
  );
}
