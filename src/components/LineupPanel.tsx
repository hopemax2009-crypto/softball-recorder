import { useState } from 'react';
import type { Game, Player, Position } from '../types';
import { BATTING_ORDERS, POSITIONS } from '../types';
import {
  assignPlayerToBattingOrderWithPosition,
  BATTING_ONLY_POSITIONS,
  FIELD_POSITIONS,
  getPlayerAtBattingOrder,
  getPlayerAtPosition,
} from '../utils/gameLogic';
import { PlayerPickerSheet } from './PlayerPickerSheet';
import { Card } from './ui';

type LineupAssignStep =
  | { phase: 'player'; order: number }
  | { phase: 'position'; order: number; playerId: string }
  | null;

interface Props {
  game: Game;
  players: Player[];
  onUpdate: (game: Game) => void;
  readOnly?: boolean;
  hasBottomNav?: boolean;
}

function lineupPositionLabel(pos: Position | undefined): string | null {
  if (!pos || pos === 'BN') return null;
  return POSITIONS.find((p) => p.value === pos)?.label.split(' ').pop() ?? pos;
}

function lineupPositionSummary(pos: Position | undefined): string {
  if (!pos || pos === 'BN') return '板凳';
  return lineupPositionLabel(pos) ?? pos;
}

export function LineupPanel({
  game,
  players,
  onUpdate,
  readOnly = false,
  hasBottomNav = true,
}: Props) {
  const [assignStep, setAssignStep] = useState<LineupAssignStep>(null);

  const assignedIds = BATTING_ORDERS.map((order) => getPlayerAtBattingOrder(game, order)).filter(
    (id): id is string => !!id
  );
  const pickingOrder = assignStep?.order ?? null;
  const currentPlayerId = pickingOrder != null ? getPlayerAtBattingOrder(game, pickingOrder) : null;
  const disabledIds = assignedIds.filter((id) => id !== currentPlayerId);

  const closeAssign = () => setAssignStep(null);

  const handlePlayerSelect = (playerId: string | null) => {
    if (pickingOrder == null || readOnly) return;

    if (!playerId) {
      onUpdate(assignPlayerToBattingOrderWithPosition(game, pickingOrder, null));
      closeAssign();
      return;
    }

    setAssignStep({ phase: 'position', order: pickingOrder, playerId });
  };

  const handlePositionSelect = (position: Position) => {
    if (!assignStep || assignStep.phase !== 'position' || readOnly) return;
    onUpdate(
      assignPlayerToBattingOrderWithPosition(
        game,
        assignStep.order,
        assignStep.playerId,
        position
      )
    );
    closeAssign();
  };

  const positionStepPlayer =
    assignStep?.phase === 'position'
      ? players.find((p) => p.id === assignStep.playerId)
      : null;
  const currentEntryPosition =
    assignStep?.phase === 'position'
      ? (game.lineup ?? []).find(
          (l) => l.isActive && l.playerId === assignStep.playerId
        )?.position ?? 'BN'
      : 'BN';

  return (
    <div className="space-y-3">
      {readOnly ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">比賽已完成，棒次設定僅供查閱</p>
      ) : (
        <p className="text-sm text-gray-500 px-1">
          點擊棒次選人並設定守位（DH/EP 僅排棒次不佔守備；與「守位」分頁同步）
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {BATTING_ORDERS.map((order) => {
          const playerId = getPlayerAtBattingOrder(game, order);
          const player = playerId ? players.find((p) => p.id === playerId) : null;
          const entry = (game.lineup ?? []).find((l) => l.isActive && l.battingOrder === order);
          const posLabel = lineupPositionLabel(entry?.position);
          return (
            <button
              key={order}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setAssignStep({ phase: 'player', order })}
              className={`rounded-xl border-2 p-2 min-h-[72px] flex flex-col items-center justify-center text-center ${
                player
                  ? 'border-field-green bg-green-50'
                  : 'border-dashed border-gray-300 bg-gray-50'
              } ${readOnly ? 'cursor-default' : 'active:opacity-70'}`}
            >
              <span className="text-lg font-bold text-field-green leading-none">{order}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">棒</span>
              <span className="text-xs font-medium mt-1 truncate w-full px-0.5">
                {player?.name ?? '—'}
              </span>
              {posLabel && (
                <span className="text-[10px] font-semibold text-amber-600 mt-0.5">{posLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {assignedIds.length > 0 && (
        <Card className="bg-green-50 !p-3">
          <h4 className="text-sm font-medium text-field-green mb-2">目前打序（{assignedIds.length} 人）</h4>
          <ol className="space-y-1">
            {BATTING_ORDERS.filter((o) => getPlayerAtBattingOrder(game, o)).map((order) => {
              const pid = getPlayerAtBattingOrder(game, order)!;
              const player = players.find((p) => p.id === pid);
              const entry = (game.lineup ?? []).find((l) => l.isActive && l.battingOrder === order);
              return (
                <li key={order} className="text-sm flex justify-between gap-2">
                  <span>{order}. {player?.name ?? '?'}</span>
                  <span className="text-amber-600 text-xs shrink-0">
                    {lineupPositionSummary(entry?.position)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {players.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">請先到球員頁面新增球員</p>
      )}

      {assignStep?.phase === 'player' && pickingOrder != null && (
        <PlayerPickerSheet
          title={`${pickingOrder} 棒 — 選擇球員`}
          players={players}
          selectedId={currentPlayerId}
          disabledIds={disabledIds}
          hasBottomNav={hasBottomNav}
          onSelect={handlePlayerSelect}
          onClose={closeAssign}
        />
      )}

      {assignStep?.phase === 'position' && positionStepPlayer && (
        <LineupPositionPickerSheet
          title={`${positionStepPlayer.name} — 設定守位 / 角色`}
          order={assignStep.order}
          selectedPosition={currentEntryPosition}
          game={game}
          playerId={assignStep.playerId}
          hasBottomNav={hasBottomNav}
          onSelect={handlePositionSelect}
          onBack={() => setAssignStep({ phase: 'player', order: assignStep.order })}
          onClose={closeAssign}
        />
      )}
    </div>
  );
}

function LineupPositionPickerSheet({
  title,
  order,
  selectedPosition,
  game,
  playerId,
  hasBottomNav,
  onSelect,
  onBack,
  onClose,
}: {
  title: string;
  order: number;
  selectedPosition: Position;
  game: Game;
  playerId: string;
  hasBottomNav: boolean;
  onSelect: (position: Position) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const sheetBottom = hasBottomNav ? 'bottom-16' : 'bottom-0';
  const sheetMaxH = hasBottomNav ? 'max-h-[calc(100dvh-4.5rem)]' : 'max-h-[85dvh]';

  const isTaken = (pos: Position) => {
    const occupant = getPlayerAtPosition(game, pos);
    return !!occupant && occupant !== playerId;
  };

  const renderOption = (pos: Position, label: string, hint?: string) => {
    const taken = pos !== 'BN' && isTaken(pos);
    const selected = selectedPosition === pos;
    return (
      <button
        key={pos}
        type="button"
        disabled={taken}
        onClick={() => onSelect(pos)}
        className={`rounded-xl border-2 px-3 py-2.5 text-left min-h-[48px] ${
          taken
            ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
            : selected
              ? 'border-field-green bg-green-50 active:opacity-70'
              : 'border-gray-200 bg-white active:opacity-70'
        }`}
      >
        <span className="font-semibold text-sm">{label}</span>
        {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
        {taken && <span className="block text-[10px] text-gray-400 mt-0.5">已被占用</span>}
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="關閉"
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 z-[70] bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col ${sheetBottom} ${sheetMaxH}`}
      >
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-field-green font-medium py-1"
            >
              ← 重選球員
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
            >
              ✕
            </button>
          </div>
          <p className="font-bold text-base">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{order} 棒</p>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] space-y-4">
          <section>
            <p className="text-xs font-medium text-gray-500 mb-2">守備位置</p>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_POSITIONS.map((pos) => {
                const label = POSITIONS.find((p) => p.value === pos)?.label ?? pos;
                return renderOption(pos, label);
              })}
            </div>
          </section>
          <section>
            <p className="text-xs font-medium text-gray-500 mb-2">僅打序（不佔守備）</p>
            <div className="grid grid-cols-2 gap-2">
              {BATTING_ONLY_POSITIONS.map((pos) => {
                const label = POSITIONS.find((p) => p.value === pos)?.label ?? pos;
                return renderOption(pos, label, '不佔守備位置');
              })}
              {renderOption('BN', '僅棒次', '尚未指派守備')}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
