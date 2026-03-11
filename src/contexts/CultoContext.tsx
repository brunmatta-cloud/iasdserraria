import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Culto, MomentoProgramacao, ExecutionMode, MomentStatus } from '@/types/culto';
import { calcularHorarioTermino } from '@/types/culto';
import { useSyncState, type SyncState } from '@/hooks/useSyncState';

interface CultoContextType {
  cultos: Culto[];
  addCulto: (c: Culto) => void;
  updateCulto: (c: Culto) => void;
  removeCulto: (id: string) => void;
  duplicateCulto: (id: string) => void;
  activeCultoId: string;
  setActiveCultoId: (id: string) => void;
  culto: Culto;
  setCulto: React.Dispatch<React.SetStateAction<Culto>>;
  momentos: MomentoProgramacao[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>>;
  currentIndex: number;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  isPaused: boolean;
  elapsedSeconds: number;
  momentElapsedSeconds: number;
  avancar: () => void;
  voltar: () => void;
  pausar: () => void;
  retomar: () => void;
  pular: () => void;
  iniciarCulto: () => void;
  finalizarCulto: () => void;
  restaurarCulto: () => void;
  reiniciarCulto: () => void;
  getMomentStatus: (index: number) => MomentStatus;
  marcarChamado: (id: string) => void;
  addMomento: (m: MomentoProgramacao) => void;
  updateMomento: (m: MomentoProgramacao) => void;
  removeMomento: (id: string) => void;
  adjustCurrentMomentDuration: (deltaSeconds: number) => void;
  // Cronometro sync fields
  isBlinking: boolean;
  toggleBlink: () => void;
  setBlinking: (v: boolean) => void;
  syncMessage: string;
  setSyncMessage: (msg: string) => void;
  syncShowMessage: boolean;
  setSyncShowMessage: (v: boolean) => void;
}

const CultoContext = createContext<CultoContextType | null>(null);

const SAMPLE_CULTOS: Culto[] = [
  {
    id: '1',
    nome: 'Culto de Domingo',
    data: new Date().toISOString().split('T')[0],
    horarioInicial: '09:00',
    duracaoPrevista: 120,
    status: 'planejado',
  },
  {
    id: '2',
    nome: 'Culto de Quarta',
    data: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    horarioInicial: '19:30',
    duracaoPrevista: 90,
    status: 'planejado',
  },
];

const SAMPLE_MOMENTOS: Record<string, MomentoProgramacao[]> = {
  '1': [
    { id: '1', cultoId: '1', ordem: 0, bloco: 'Abertura', horarioInicio: '09:00', duracao: 5, atividade: 'Vinheta de Abertura', responsavel: 'Equipe de Midia', ministerio: 'Midia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '2', cultoId: '1', ordem: 1, bloco: 'Louvor', horarioInicio: '09:05', duracao: 15, atividade: 'Louvor e Adoracao', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Lider de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones do louvor', observacao: 'Repertorio confirmado', antecedenciaChamada: 10, chamado: false },
    { id: '3', cultoId: '1', ordem: 2, bloco: 'Louvor', horarioInicio: '09:20', duracao: 10, atividade: 'Louvor Especial', responsavel: 'Joao Santos', ministerio: 'Louvor', funcao: 'Cantor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Mic solo', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '4', cultoId: '1', ordem: 3, bloco: 'Palavra', horarioInicio: '09:30', duracao: 5, atividade: 'Oracao Pastoral', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical suave', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '5', cultoId: '1', ordem: 4, bloco: 'Palavra', horarioInicio: '09:35', duracao: 5, atividade: 'Avisos da Semana', responsavel: 'Ana Costa', ministerio: 'Comunicacao', funcao: 'Apresentadora', fotoUrl: '', tipoMomento: 'aviso', tipoMidia: 'video', acaoSonoplastia: 'Slides de avisos', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '6', cultoId: '1', ordem: 5, bloco: 'Palavra', horarioInicio: '09:40', duracao: 40, atividade: 'Mensagem', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pregador', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic pulpito', observacao: 'Tema: Fe e Esperanca', antecedenciaChamada: 5, chamado: false },
    { id: '7', cultoId: '1', ordem: 6, bloco: 'Encerramento', horarioInicio: '10:20', duracao: 10, atividade: 'Oracao Final e Bencao', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '8', cultoId: '1', ordem: 7, bloco: 'Encerramento', horarioInicio: '10:30', duracao: 5, atividade: 'Vinheta de Encerramento', responsavel: 'Equipe de Midia', ministerio: 'Midia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta final', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
  '2': [
    { id: '9', cultoId: '2', ordem: 0, bloco: 'Louvor', horarioInicio: '19:30', duracao: 20, atividade: 'Louvor e Adoracao', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Lider de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '10', cultoId: '2', ordem: 1, bloco: 'Palavra', horarioInicio: '19:50', duracao: 45, atividade: 'Estudo Biblico', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic pulpito', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
};

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cultos, setCultos] = useState<Culto[]>(SAMPLE_CULTOS);
  const [allMomentos, setAllMomentos] = useState<Record<string, MomentoProgramacao[]>>(SAMPLE_MOMENTOS);
  const [activeCultoId, setActiveCultoIdState] = useState<string>(SAMPLE_CULTOS[0].id);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('manual');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedBase, setElapsedBase] = useState(0);
  const [momentElapsedBase, setMomentElapsedBase] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [displayMomentElapsed, setDisplayMomentElapsed] = useState(0);
  // Cronometro sync fields
  const [isBlinking, setIsBlinking] = useState(false);
  const [syncMessage, setSyncMessageState] = useState('');
  const [syncShowMessage, setSyncShowMessageState] = useState(false);

  const rafRef = useRef<number>(0);
  const momentosRef = useRef<MomentoProgramacao[]>([]);
  const currentIndexRef = useRef(-1);
  const executionModeRef = useRef<ExecutionMode>('manual');
  const timerStartedAtRef = useRef(0);
  const elapsedBaseRef = useRef(0);
  const momentElapsedBaseRef = useRef(0);
  const isRunningRef = useRef(false);
  const doAvancarRef = useRef<() => void>(() => {});
  const activeCultoIdRef = useRef(activeCultoId);
  activeCultoIdRef.current = activeCultoId;
  const syncLoadedRef = useRef(false);

  const safeCultos = Array.isArray(cultos) ? cultos : SAMPLE_CULTOS;
  const safeAllMomentos = (allMomentos && typeof allMomentos === 'object' && !Array.isArray(allMomentos)) ? allMomentos : SAMPLE_MOMENTOS;
  const culto = safeCultos.find((item) => item.id === activeCultoId) || safeCultos[0] || SAMPLE_CULTOS[0];
  const momentos = (safeAllMomentos[activeCultoId] || []) as MomentoProgramacao[];

  momentosRef.current = momentos;
  currentIndexRef.current = currentIndex;
  executionModeRef.current = executionMode;
  timerStartedAtRef.current = timerStartedAt;
  elapsedBaseRef.current = elapsedBase;
  momentElapsedBaseRef.current = momentElapsedBase;

  const isRunning = culto.status === 'em_andamento' && !isPaused && currentIndex >= 0;
  isRunningRef.current = isRunning;

  // ---- Sync with DB ----
  const handleRemoteUpdate = useCallback((remote: SyncState) => {
    if (remote.cultos.length > 0) setCultos(remote.cultos);
    if (Object.keys(remote.allMomentos).length > 0) setAllMomentos(remote.allMomentos);
    if (remote.activeCultoId) setActiveCultoIdState(remote.activeCultoId);
    setCurrentIndex(remote.currentIndex);
    setExecutionMode(remote.executionMode);
    setIsPaused(remote.isPaused);
    setElapsedBase(remote.elapsedSeconds);
    setMomentElapsedBase(remote.momentElapsedSeconds);
    // If remote says running, restart timer from saved base
    if (!remote.isPaused && remote.currentIndex >= 0) {
      setTimerStartedAt(Date.now());
    } else {
      setTimerStartedAt(0);
    }
    setIsBlinking(remote.isBlinking);
    setSyncMessageState(remote.message);
    setSyncShowMessageState(remote.showMessage);
    syncLoadedRef.current = true;
  }, []);

  const { saveState } = useSyncState(handleRemoteUpdate);

  // Save to DB whenever relevant state changes
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!syncLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const { elapsed, momentElapsed } = computeElapsed();
      saveState({
        cultos: safeCultos,
        allMomentos: safeAllMomentos,
        activeCultoId,
        currentIndex,
        executionMode,
        isPaused,
        elapsedSeconds: elapsed,
        momentElapsedSeconds: momentElapsed,
        message: syncMessage,
        showMessage: syncShowMessage,
        isBlinking,
      });
    }, 400);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [cultos, allMomentos, activeCultoId, currentIndex, executionMode, isPaused, elapsedBase, momentElapsedBase, syncMessage, syncShowMessage, isBlinking]);

  const setActiveCultoId = useCallback((id: string) => {
    setActiveCultoIdState(id);
  }, []);

  const computeElapsed = useCallback(() => {
    const startedAt = timerStartedAtRef.current;
    if (startedAt <= 0) {
      return {
        elapsed: Math.max(0, elapsedBaseRef.current),
        momentElapsed: Math.max(0, momentElapsedBaseRef.current),
      };
    }
    const now = Date.now();
    if (now < startedAt) {
      return {
        elapsed: Math.max(0, elapsedBaseRef.current),
        momentElapsed: Math.max(0, momentElapsedBaseRef.current),
      };
    }
    const delta = Math.floor((now - startedAt) / 1000);
    return {
      elapsed: Math.max(0, elapsedBaseRef.current + delta),
      momentElapsed: Math.max(0, momentElapsedBaseRef.current + delta),
    };
  }, []);

  useEffect(() => {
    let lastSecond = -1;
    let active = true;
    const tick = () => {
      if (!active) return;
      if (isRunningRef.current) {
        const startedAt = timerStartedAtRef.current;
        if (startedAt > 0) {
          const now = Date.now();
          if (now >= startedAt) {
            const delta = Math.floor((now - startedAt) / 1000);
            const elapsed = Math.max(0, elapsedBaseRef.current + delta);
            const momentElapsed = Math.max(0, momentElapsedBaseRef.current + delta);
            if (Math.floor(momentElapsed) !== lastSecond) {
              lastSecond = Math.floor(momentElapsed);
              setDisplayElapsed(elapsed);
              setDisplayMomentElapsed(momentElapsed);
              if (executionModeRef.current === 'automatico') {
                const idx = currentIndexRef.current;
                const moms = momentosRef.current;
                if (idx >= 0 && idx < moms.length && moms.length > 0) {
                  const currentMom = moms[idx];
                  if (currentMom && typeof currentMom.duracao === 'number') {
                    const dur = currentMom.duracao * 60;
                    if (momentElapsed >= dur && doAvancarRef.current) {
                      doAvancarRef.current();
                    }
                  }
                }
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setDisplayElapsed(elapsedBase);
      setDisplayMomentElapsed(momentElapsedBase);
    }
  }, [isRunning, elapsedBase, momentElapsedBase]);

  const setCulto: React.Dispatch<React.SetStateAction<Culto>> = useCallback((valOrFn) => {
    setCultos((prev) => prev.map((item) => {
      if (item.id !== activeCultoIdRef.current) return item;
      return typeof valOrFn === 'function' ? valOrFn(item) : valOrFn;
    }));
  }, []);

  const setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>> = useCallback((valOrFn) => {
    setAllMomentos((prev) => ({
      ...prev,
      [activeCultoIdRef.current]: typeof valOrFn === 'function' ? valOrFn(prev[activeCultoIdRef.current] || []) : valOrFn,
    }));
  }, []);

  const addCulto = useCallback((c: Culto) => {
    setCultos((prev) => [...prev, c]);
    setAllMomentos((prev) => ({ ...prev, [c.id]: [] }));
  }, []);

  const updateCulto = useCallback((c: Culto) => {
    setCultos((prev) => prev.map((existing) => existing.id === c.id ? c : existing));
  }, []);

  const removeCulto = useCallback((id: string) => {
    setCultos((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeCultoId === id && next.length > 0) setActiveCultoId(next[0].id);
      return next;
    });
    setAllMomentos((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, [activeCultoId]);

  const duplicateCulto = useCallback((id: string) => {
    setCultos((prev) => {
      const original = prev.find((item) => item.id === id);
      if (!original) return prev;
      const newId = crypto.randomUUID();
      const newCulto: Culto = { ...original, id: newId, nome: `${original.nome} (Copia)`, status: 'planejado' };
      setAllMomentos((prevMomentos) => {
        const originalMomentos = prevMomentos[id] || [];
        const newMomentos = originalMomentos.map((momento) => ({ ...momento, id: crypto.randomUUID(), cultoId: newId, chamado: false }));
        return { ...prevMomentos, [newId]: newMomentos };
      });
      return [...prev, newCulto];
    });
  }, []);

  const doAvancar = useCallback(() => {
    setCurrentIndex((prev) => {
      const moms = momentosRef.current;
      if (prev < moms.length - 1) {
        setMomentElapsedBase(0);
        setTimerStartedAt(Date.now());
        return prev + 1;
      }
      setCultos((prevCultos) => prevCultos.map((item) => {
        if (item.id !== activeCultoIdRef.current) return item;
        return { ...item, status: 'finalizado' as const };
      }));
      setTimerStartedAt(0);
      return prev;
    });
  }, []);
  doAvancarRef.current = doAvancar;

  const avancar = useCallback(() => doAvancar(), [doAvancar]);

  const voltar = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) { setMomentElapsedBase(0); setTimerStartedAt(Date.now()); return prev - 1; }
      return prev;
    });
  }, []);

  const pausar = useCallback(() => {
    const { elapsed, momentElapsed } = computeElapsed();
    setElapsedBase(elapsed);
    setMomentElapsedBase(momentElapsed);
    setTimerStartedAt(0);
    setIsPaused(true);
  }, [computeElapsed]);

  const retomar = useCallback(() => {
    setTimerStartedAt(Date.now());
    setIsPaused(false);
  }, []);

  const pular = useCallback(() => doAvancar(), [doAvancar]);

  const iniciarCulto = useCallback(() => {
    setMomentos((prev) => prev.map((momento) => ({ ...momento, duracaoOriginal: momento.duracaoOriginal ?? momento.duracao })));
    setCulto((current) => ({ ...current, status: 'em_andamento' }));
    setCurrentIndex(0);
    setElapsedBase(0);
    setMomentElapsedBase(0);
    setTimerStartedAt(Date.now());
    setIsPaused(false);
  }, [setCulto, setMomentos]);

  const finalizarCulto = useCallback(() => {
    const { elapsed, momentElapsed } = computeElapsed();
    setElapsedBase(elapsed);
    setMomentElapsedBase(momentElapsed);
    setTimerStartedAt(0);
    setCulto((current) => ({ ...current, status: 'finalizado' }));
    setIsPaused(true);
  }, [computeElapsed, setCulto]);

  const restaurarCulto = useCallback(() => {
    setCulto((current) => ({ ...current, status: 'em_andamento' }));
    setIsPaused(true);
    setTimerStartedAt(0);
  }, [setCulto]);

  const reiniciarCulto = useCallback(() => {
    setMomentos((prev) => prev.map((m) => ({ ...m, chamado: false, duracaoOriginal: undefined })));
    setCulto((current) => ({ ...current, status: 'planejado' }));
    setCurrentIndex(-1);
    setElapsedBase(0);
    setMomentElapsedBase(0);
    setTimerStartedAt(0);
    setIsPaused(false);
  }, [setCulto, setMomentos]);

  const getMomentStatus = useCallback((index: number): MomentStatus => {
    if (currentIndex < 0) return index === 0 ? 'proximo' : 'futuro';
    if (index < currentIndex) return 'concluido';
    if (index === currentIndex) return 'executando';
    if (index === currentIndex + 1) return 'proximo';
    return 'futuro';
  }, [currentIndex]);

  const marcarChamado = useCallback((id: string) => {
    setMomentos((prev) => prev.map((momento) => momento.id === id ? { ...momento, chamado: true } : momento));
  }, [setMomentos]);

  const addMomento = useCallback((m: MomentoProgramacao) => {
    setMomentos((prev) => [...prev, m].sort((a, b) => a.ordem - b.ordem));
  }, [setMomentos]);

  const updateMomento = useCallback((m: MomentoProgramacao) => {
    setMomentos((prev) => prev.map((existing) => existing.id === m.id ? m : existing));
  }, [setMomentos]);

  const removeMomento = useCallback((id: string) => {
    setMomentos((prev) => prev.filter((momento) => momento.id !== id));
  }, [setMomentos]);

  const recalcStartTimes = (moms: MomentoProgramacao[], fromIndex: number): MomentoProgramacao[] => {
    const result = [...moms];
    for (let i = fromIndex; i < result.length; i++) {
      if (i === 0) continue;
      const prev = result[i - 1];
      result[i] = { ...result[i], horarioInicio: calcularHorarioTermino(prev.horarioInicio, prev.duracao) };
    }
    return result;
  };

  const adjustCurrentMomentDuration = useCallback((deltaSeconds: number) => {
    if (currentIndex < 0) return;
    setMomentos((prev) => {
      const updated = [...prev];
      const current = updated[currentIndex];
      const newDuracao = Math.max(0, current.duracao + deltaSeconds / 60);
      updated[currentIndex] = { ...current, duracao: newDuracao, duracaoOriginal: current.duracaoOriginal ?? current.duracao };
      return recalcStartTimes(updated, currentIndex + 1);
    });
  }, [currentIndex, setMomentos]);

  const toggleBlink = useCallback(() => setIsBlinking((v) => !v), []);
  const setBlinking = useCallback((v: boolean) => setIsBlinking(v), []);
  const setSyncMessage = useCallback((msg: string) => setSyncMessageState(msg), []);
  const setSyncShowMessage = useCallback((v: boolean) => setSyncShowMessageState(v), []);

  return (
    <CultoContext.Provider value={{
      cultos, addCulto, updateCulto, removeCulto, duplicateCulto,
      activeCultoId, setActiveCultoId,
      culto, setCulto, momentos, allMomentos, setMomentos,
      currentIndex, executionMode, setExecutionMode,
      isPaused,
      elapsedSeconds: displayElapsed,
      momentElapsedSeconds: displayMomentElapsed,
      avancar, voltar, pausar, retomar, pular,
      iniciarCulto, finalizarCulto, restaurarCulto, reiniciarCulto,
      getMomentStatus, marcarChamado,
      addMomento, updateMomento, removeMomento,
      adjustCurrentMomentDuration,
      isBlinking, toggleBlink, setBlinking,
      syncMessage, setSyncMessage,
      syncShowMessage, setSyncShowMessage,
    }}>
      {children}
    </CultoContext.Provider>
  );
};

export const useCulto = () => {
  const ctx = useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  return ctx;
};
