import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Culto, MomentoProgramacao, ExecutionMode } from '@/types/culto';

const SYNC_ROW_ID = 'main';
const DEBOUNCE_MS = 300;
const PROTECTION_WINDOW_MS = 5000;

export interface SyncState {
  cultos: Culto[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  activeCultoId: string | null;
  currentIndex: number;
  executionMode: ExecutionMode;
  isPaused: boolean;
  elapsedSeconds: number;
  momentElapsedSeconds: number;
  message: string;
  showMessage: boolean;
  isBlinking: boolean;
}

const DEFAULT_SYNC_STATE: SyncState = {
  cultos: [],
  allMomentos: {},
  activeCultoId: null,
  currentIndex: -1,
  executionMode: 'manual',
  isPaused: false,
  elapsedSeconds: 0,
  momentElapsedSeconds: 0,
  message: '',
  showMessage: false,
  isBlinking: false,
};

function rowToState(row: any): SyncState {
  return {
    cultos: Array.isArray(row.cultos) ? row.cultos : [],
    allMomentos: row.all_momentos && typeof row.all_momentos === 'object' && !Array.isArray(row.all_momentos) ? row.all_momentos : {},
    activeCultoId: row.active_culto_id ?? null,
    currentIndex: typeof row.current_index === 'number' ? row.current_index : -1,
    executionMode: row.execution_mode === 'automatico' ? 'automatico' : 'manual',
    isPaused: Boolean(row.is_paused),
    elapsedSeconds: typeof row.elapsed_seconds === 'number' ? row.elapsed_seconds : 0,
    momentElapsedSeconds: typeof row.moment_elapsed_seconds === 'number' ? row.moment_elapsed_seconds : 0,
    message: typeof row.message === 'string' ? row.message : '',
    showMessage: Boolean(row.show_message),
    isBlinking: Boolean(row.is_blinking),
  };
}

function stateToRow(state: SyncState) {
  return {
    id: SYNC_ROW_ID,
    cultos: state.cultos as any,
    all_momentos: state.allMomentos as any,
    active_culto_id: state.activeCultoId,
    current_index: state.currentIndex,
    execution_mode: state.executionMode,
    is_paused: state.isPaused,
    elapsed_seconds: state.elapsedSeconds,
    moment_elapsed_seconds: state.momentElapsedSeconds,
    message: state.message,
    show_message: state.showMessage,
    is_blinking: state.isBlinking,
    updated_at: new Date().toISOString(),
  };
}

export function useSyncState(
  onRemoteUpdate: (state: SyncState) => void,
) {
  const lastLocalWriteRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;
  const initialLoadDone = useRef(false);

  // Load initial state
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('culto_sync_state')
        .select('*')
        .eq('id', SYNC_ROW_ID)
        .maybeSingle();

      if (data && !error) {
        onRemoteUpdateRef.current(rowToState(data));
      }
      initialLoadDone.current = true;
    };
    load();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('culto-sync-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'culto_sync_state',
          filter: `id=eq.${SYNC_ROW_ID}`,
        },
        (payload) => {
          // Skip if this was our own write (protection window)
          if (Date.now() - lastLocalWriteRef.current < PROTECTION_WINDOW_MS) return;
          if (payload.new) {
            onRemoteUpdateRef.current(rowToState(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save state to DB (debounced)
  const saveState = useCallback((state: SyncState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastLocalWriteRef.current = Date.now();
      const row = stateToRow(state);
      const { error } = await supabase
        .from('culto_sync_state')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar estado:', error);
      }
    }, DEBOUNCE_MS);
  }, []);

  return { saveState, DEFAULT_SYNC_STATE };
}
