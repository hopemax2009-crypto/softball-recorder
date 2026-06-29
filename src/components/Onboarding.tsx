import { useState } from 'react';
import { Button, Card, Input } from './ui';

interface Props {
  onComplete: (id: string, name: string) => void;
}

export function Onboarding({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedId = (id.trim() || trimmedName).toLowerCase().replace(/\s+/g, '-');
    if (!trimmedName) return;
    onComplete(trimmedId, trimmedName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-field-green to-field-light">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">⚾</div>
          <h1 className="text-2xl font-bold text-field-green">壘球賽紀錄器</h1>
          <p className="text-gray-500 mt-2 text-sm">個人打擊紀錄 · 賽季統計 · 雲端同步</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="您的名稱"
            placeholder="例：王小明"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="識別 ID（選填）"
            placeholder="用於雲端儲存，預設為名稱"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <Button type="submit" className="w-full">
            開始使用
          </Button>
        </form>
      </Card>
    </div>
  );
}
