import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../types';
import { loadGitHubConfig, syncSharedGame } from '../services/github';

export interface SharedSyncState {
  syncing: boolean;
  lastSync: Date | null;
  lastAction: string;
  error: string | null;
}

export function useSharedGameSync(
  activeGame: Game | null,
  onGameUpdated: (game: Game) => void,
  intervalMs = 8000
) {
  const [syncState, setSyncState] = useState<SharedSyncState>({
    syncing: false,
    lastSync: null,
    lastAction: '',
    error: null,
  });
  const activeGameRef = useRef(activeGame);
  activeGameRef.current = activeGame;

  const syncNow = useCallback(async () => {
    const game = activeGameRef.current;
    const config = loadGitHubConfig();
    if (!game?.isShared || !game.teamCode || !config) return;

    setSyncState((s) => ({ ...s, syncing: true, error: null }));
    try {
      const result = await syncSharedGame(config, game);
      onGameUpdated(result.game);
      const labels = { pushed: '已上傳', pulled: '已更新', merged: '已合併' };
      setSyncState({
        syncing: false,
        lastSync: new Date(),
        lastAction: labels[result.action],
        error: null,
      });
    } catch (e) {
      setSyncState((s) => ({
        ...s,
        syncing: false,
        error: e instanceof Error ? e.message : '同步失敗',
      }));
    }
  }, [onGameUpdated]);

  useEffect(() => {
    if (!activeGame?.isShared || !loadGitHubConfig()) return;

    syncNow();
    const id = setInterval(syncNow, intervalMs);
    return () => clearInterval(id);
  }, [activeGame?.id, activeGame?.isShared, intervalMs, syncNow]);

  return { syncState, syncNow };
}
