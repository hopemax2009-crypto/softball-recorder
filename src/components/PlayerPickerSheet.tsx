import type { Player } from '../types';

interface Props {
  title: string;
  players: Player[];
  selectedId?: string | null;
  /** 已被其他棒次/守位占用的球員，不可選 */
  disabledIds?: string[];
  allowClear?: boolean;
  hasBottomNav?: boolean;
  onSelect: (playerId: string | null) => void;
  onClose: () => void;
}

export function PlayerPickerSheet({
  title,
  players,
  selectedId,
  disabledIds = [],
  allowClear = true,
  hasBottomNav = true,
  onSelect,
  onClose,
}: Props) {
  const disabledSet = new Set(disabledIds);
  const sheetBottom = hasBottomNav ? 'bottom-16' : 'bottom-0';
  const sheetMaxH = hasBottomNav ? 'max-h-[calc(100dvh-4.5rem)]' : 'max-h-[85dvh]';

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
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="font-bold text-base">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] space-y-2">
          {allowClear && selectedId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-red-200 text-red-600 font-medium"
            >
              清除選擇
            </button>
          )}
          {players.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">尚無可選球員</p>
          ) : (
            players.map((player) => {
              const disabled = disabledSet.has(player.id);
              const selected = player.id === selectedId;
              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(player.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border-2 text-left ${
                    selected
                      ? 'border-field-green bg-green-50'
                      : disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 bg-white active:opacity-70'
                  }`}
                >
                  {player.number && (
                    <span className="text-field-green font-bold w-8">#{player.number}</span>
                  )}
                  <span className="font-semibold flex-1">{player.name}</span>
                  {disabled && <span className="text-xs text-gray-400">已指派</span>}
                  {selected && <span className="text-xs text-field-green font-medium">目前</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
