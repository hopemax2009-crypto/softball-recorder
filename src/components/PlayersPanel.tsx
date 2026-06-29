import { useState } from 'react';
import type { Player } from '../types';
import { Button, Card, EmptyState, Input } from './ui';

interface Props {
  players: Player[];
  onAddPlayer: (name: string, number?: string) => void;
  onDeletePlayer: (playerId: string) => void;
}

export function PlayersPanel({ players, onAddPlayer, onDeletePlayer }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddPlayer(name.trim(), number.trim() || undefined);
    setName('');
    setNumber('');
    setShowAdd(false);
  };

  return (
    <div className="p-4 space-y-4">
      <Button onClick={() => setShowAdd(true)} className="w-full">
        新增球員
      </Button>

      {showAdd && (
        <Card className="space-y-3">
          <Input
            label="球員姓名"
            placeholder="例：陳大明"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label="背號（選填）"
            placeholder="例：7"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="flex-1">新增</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">取消</Button>
          </div>
        </Card>
      )}

      {players.length === 0 ? (
        <EmptyState icon="👥" title="尚無球員" description="新增球員後即可紀錄打席" />
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Card key={player.id} className="flex items-center justify-between">
              <div>
                <span className="font-semibold">
                  {player.number && (
                    <span className="text-field-green mr-2">#{player.number}</span>
                  )}
                  {player.name}
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`確定刪除 ${player.name}？`)) onDeletePlayer(player.id);
                }}
                className="text-red-400 text-sm px-2 py-1"
              >
                刪除
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
