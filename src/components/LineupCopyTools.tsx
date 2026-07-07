import { useState } from 'react';
import type { Game, LineupTemplate, Player } from '../types';
import {
  applyLineupEntries,
  extractLineupTemplateEntries,
  filterEntriesByPlayers,
  findLineupSourceGames,
  formatLineupSourceLabel,
} from '../utils/lineupTemplate';
import { Button, Card, Input, Select } from './ui';

interface Props {
  game: Game;
  games: Game[];
  players: Player[];
  lineupTemplates: LineupTemplate[];
  onUpdate: (game: Game) => void;
  onAddTemplate: (name: string, entries: ReturnType<typeof extractLineupTemplateEntries>) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function LineupCopyTools({
  game,
  games,
  players,
  lineupTemplates,
  onUpdate,
  onAddTemplate,
  onDeleteTemplate,
}: Props) {
  const [sourceGameId, setSourceGameId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [status, setStatus] = useState('');

  const sourceGames = findLineupSourceGames(games, game.id);
  const currentEntries = extractLineupTemplateEntries(game);
  const hasCurrentLineup = currentEntries.length > 0;
  const hasAtBats = game.atBats.length > 0;

  const confirmOverwrite = () => {
    if (!hasCurrentLineup && !hasAtBats) return true;
    return confirm(
      hasAtBats
        ? '此場已有打席紀錄，覆蓋先發不會刪除打席，但可能造成棒次與紀錄不一致。確定繼續？'
        : '將覆蓋目前的先發設定，確定繼續？'
    );
  };

  const applyEntries = (entries: ReturnType<typeof extractLineupTemplateEntries>, label: string) => {
    if (entries.length === 0) {
      setStatus('沒有可套用的先發資料');
      return;
    }
    const { entries: valid, skipped } = filterEntriesByPlayers(entries, players);
    if (valid.length === 0) {
      setStatus('先發中的球員已不存在，請先新增球員或更新模板');
      return;
    }
    onUpdate(applyLineupEntries(game, valid));
    if (skipped.length > 0) {
      setStatus(`已套用「${label}」（${valid.length} 人）；略過 ${skipped.length} 位已刪除球員`);
    } else {
      setStatus(`已套用「${label}」（${valid.length} 人）`);
    }
  };

  const handleCopyFromGame = () => {
    if (!sourceGameId) {
      setStatus('請選擇要複製的比賽');
      return;
    }
    const source = games.find((g) => g.id === sourceGameId);
    if (!source) {
      setStatus('找不到所選比賽');
      return;
    }
    if (!confirmOverwrite()) return;
    applyEntries(extractLineupTemplateEntries(source), formatLineupSourceLabel(source));
  };

  const handleApplyTemplate = () => {
    if (!templateId) {
      setStatus('請選擇先發模板');
      return;
    }
    const template = lineupTemplates.find((t) => t.id === templateId);
    if (!template) {
      setStatus('找不到所選模板');
      return;
    }
    if (!confirmOverwrite()) return;
    applyEntries(template.entries, template.name);
  };

  const handleSaveTemplate = () => {
    if (!hasCurrentLineup) {
      setStatus('請先設定先發後再儲存模板');
      return;
    }
    if (!templateName.trim()) {
      setStatus('請輸入模板名稱');
      return;
    }
    const name = templateName.trim();
    onAddTemplate(name, currentEntries);
    setTemplateName('');
    setShowSave(false);
    setStatus(`已儲存模板「${name}」`);
  };

  const handleDeleteTemplate = () => {
    if (!templateId) {
      setStatus('請先選擇要刪除的模板');
      return;
    }
    const template = lineupTemplates.find((t) => t.id === templateId);
    if (!template) return;
    if (!confirm(`確定刪除模板「${template.name}」？`)) return;
    onDeleteTemplate(templateId);
    setTemplateId('');
    setStatus(`已刪除模板「${template.name}」`);
  };

  return (
    <Card className="bg-amber-50/80 border-amber-200 space-y-3">
      <h4 className="text-sm font-semibold text-amber-900">先發快速設定</h4>

      {sourceGames.length > 0 ? (
        <div className="space-y-2">
          <Select
            label="從其他比賽複製"
            value={sourceGameId}
            onChange={(e) => setSourceGameId(e.target.value)}
            options={[
              { value: '', label: '選擇比賽…' },
              ...sourceGames.map((g) => ({
                value: g.id,
                label: formatLineupSourceLabel(g),
              })),
            ]}
          />
          <Button variant="secondary" onClick={handleCopyFromGame} className="w-full !py-2">
            套用該場先發
          </Button>
        </div>
      ) : (
        <p className="text-xs text-amber-800">尚無其他比賽可先發可複製</p>
      )}

      <div className="border-t border-amber-200 pt-3 space-y-2">
        <Select
          label="先發模板"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          options={[
            { value: '', label: lineupTemplates.length === 0 ? '尚無模板' : '選擇模板…' },
            ...lineupTemplates.map((t) => ({
              value: t.id,
              label: `${t.name}（${t.entries.length} 人）`,
            })),
          ]}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleApplyTemplate}
            disabled={lineupTemplates.length === 0}
            className="flex-1 !py-2"
          >
            套用模板
          </Button>
          <Button
            variant="secondary"
            onClick={handleDeleteTemplate}
            disabled={!templateId}
            className="flex-1 !py-2 text-red-600"
          >
            刪除
          </Button>
        </div>
      </div>

      <div className="border-t border-amber-200 pt-3">
        {showSave ? (
          <div className="space-y-2">
            <Input
              label="模板名稱"
              placeholder="例：平日先發"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} className="flex-1 !py-2" disabled={!hasCurrentLineup}>
                儲存
              </Button>
              <Button variant="secondary" onClick={() => setShowSave(false)} className="flex-1 !py-2">
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setShowSave(true)}
            className="w-full !py-2"
            disabled={!hasCurrentLineup}
          >
            儲存目前先發為模板
          </Button>
        )}
        {!hasCurrentLineup && (
          <p className="text-[10px] text-amber-700 mt-1">請先排定至少一名先發球員</p>
        )}
      </div>

      {status && (
        <p className="text-xs text-amber-900 bg-white/70 rounded-lg py-2 px-2">{status}</p>
      )}
    </Card>
  );
}
