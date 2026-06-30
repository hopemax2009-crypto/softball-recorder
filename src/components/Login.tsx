import { useState } from 'react';
import type { AuthSession } from '../types';
import { login, register } from '../services/auth';
import { Button, Card, Input } from './ui';

interface Props {
  onAuth: (session: AuthSession) => void;
}

export function Login({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session =
        mode === 'login'
          ? await login(username, password)
          : await register(username, password, displayName);
      onAuth(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-field-green to-field-light">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">⚾</div>
          <h1 className="text-2xl font-bold text-field-green">壘球賽紀錄器</h1>
          <p className="text-gray-500 mt-2 text-sm">登入後紀錄個人打擊成績</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              mode === 'login' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              mode === 'register' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="帳號"
            placeholder="英數字帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="密碼"
            type="password"
            placeholder="至少 4 碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && (
            <Input
              label="顯示名稱"
              placeholder="例：王小明"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊並登入'}
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          帳密儲存於本機裝置，請妥善保管
        </p>
      </Card>
    </div>
  );
}
