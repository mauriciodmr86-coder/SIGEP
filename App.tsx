import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StaffScheduleView } from './components/StaffScheduleView';
import { ManagerView } from './components/ManagerView';
import { Server, Unit, Assignment, DayOfWeek, DAYS, Difficulty, Workload, UnitDivision, Holiday } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'public' | 'manager'>('public');
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [managerPassword, setManagerPassword] = useState('Gestor123');
  const [servers, setServers] = useState<Server[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const stateRef = useRef({ servers, units, assignments, holidays });

  useEffect(() => {
    stateRef.current = { servers, units, assignments, holidays };
  }, [servers, units, assignments, holidays]);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to server');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'INIT':
          case 'STATE_UPDATED':
            const { servers: s, units: u, assignments: a, holidays: h, managerPassword: p, lastUpdated: lu } = message.payload;
            setServers(s || []);
            setUnits(u || []);
            setAssignments(a || []);
            setHolidays(h || []);
            if (p) setManagerPassword(p);
            if (lu) setLastUpdated(lu);
            setIsInitialLoad(false);
            break;
          case 'PASSWORD_UPDATED':
            setManagerPassword(message.payload);
            break;
        }
      };

      socket.onclose = () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, []);

  const syncState = (newServers?: Server[], newUnits?: Unit[], newAssignments?: Assignment[], newHolidays?: Holiday[]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'UPDATE_STATE',
        payload: {
          servers: newServers || stateRef.current.servers,
          units: newUnits || stateRef.current.units,
          assignments: newAssignments || stateRef.current.assignments,
          holidays: newHolidays || stateRef.current.holidays
        }
      }));
    }
  };

  const requestSync = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'REQUEST_SYNC' }));
    }
  };

  const sortedServers = useMemo(() => [...servers].sort((a, b) => a.name.localeCompare(b.name)), [servers]);
  const sortedUnits = useMemo(() => [...units].sort((a, b) => a.name.localeCompare(b.name)), [units]);

  const addServer = (name: string) => {
    const newServer: Server = { id: `s-${Date.now()}`, name: name.toUpperCase(), status: 'active' };
    const next = [...servers, newServer];
    setServers(next);
    syncState(next);
  };

  const removeServer = (id: string) => {
    const nextServers = servers.filter(s => s.id !== id);
    const nextAssignments = assignments.map(a => ({
      ...a, titularId: a.titularId === id ? null : a.titularId, substituteId: a.substituteId === id ? null : a.substituteId
    }));
    setServers(nextServers);
    setAssignments(nextAssignments);
    syncState(nextServers, units, nextAssignments);
  };

  const toggleServerStatus = (id: string, reason?: string) => {
    const next = servers.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'off' : 'active', offReason: reason || '' } : s);
    setServers(next);
    syncState(next);
  };

  const addUnit = (name: string, division: UnitDivision = 'normal') => {
    const upperName = name.toUpperCase().trim();
    if (!upperName) return;
    const next = [...units, { id: `u-${Date.now()}`, name: upperName, division, processes: 0 }];
    setUnits(next);
    syncState(servers, next);
  };

  const removeUnit = (id: string) => {
    const nextUnits = units.filter(u => u.id !== id);
    const nextAssignments = assignments.filter(a => !a.unitId.startsWith(id));
    setUnits(nextUnits);
    setAssignments(nextAssignments);
    syncState(servers, nextUnits, nextAssignments);
  };

  const updateUnitMetadata = (unitId: string, metadata: { difficulty?: Difficulty | null, workload?: Workload | null, division?: UnitDivision, processes?: number }) => {
    const next = units.map(u => u.id === unitId ? { 
      ...u, 
      difficulty: metadata.difficulty !== undefined ? (metadata.difficulty === u.difficulty ? undefined : (metadata.difficulty || undefined)) : u.difficulty,
      workload: metadata.workload !== undefined ? (metadata.workload === u.workload ? undefined : (metadata.workload || undefined)) : u.workload,
      division: metadata.division !== undefined ? metadata.division : u.division,
      processes: metadata.processes !== undefined ? metadata.processes : u.processes
    } : u);
    setUnits(next);
    syncState(servers, next);
  };

  const bulkUpdateUnits = (updates: { id: string, processes: number }[]) => {
    const next = units.map(u => {
      const update = updates.find(upd => upd.id === u.id);
      return update ? { ...u, processes: update.processes } : u;
    });
    setUnits(next);
    syncState(servers, next);
  };

  const setAssignment = (unitId: string, day: DayOfWeek, type: 'titular' | 'substitute', serverId: string | null) => {
    let next: Assignment[] = [];
    const idx = assignments.findIndex(a => a.unitId === unitId && a.day === day);
    if (idx > -1) {
      next = [...assignments];
      if (type === 'titular') next[idx].titularId = serverId; else next[idx].substituteId = serverId;
    } else {
      next = [...assignments, { unitId, day, titularId: type === 'titular' ? serverId : null, substituteId: type === 'substitute' ? serverId : null }];
    }
    setAssignments(next);
    syncState(servers, units, next);
  };

  const updateHolidays = (newHolidays: Holiday[]) => {
    setHolidays(newHolidays);
    syncState(servers, units, assignments, newHolidays);
  };

  const handleUpdatePassword = (newPass: string) => {
    setManagerPassword(newPass);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'UPDATE_PASSWORD',
        payload: newPass
      }));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === managerPassword) {
      setIsManagerAuthenticated(true);
      setActiveTab('manager');
      setLoginPassword('');
    } else {
      alert("Senha incorreta!");
      setLoginPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">SIGEP</h1>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  Sistema Integrado de Gestão e Planejamento
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                  </span>
                </p>
                {lastUpdated && (
                  <p className="text-[8px] text-slate-500 font-medium uppercase tracking-tight">
                    Última atualização: {new Date(lastUpdated).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <nav className="flex bg-slate-800 rounded-xl p-1 shadow-inner">
            <button onClick={() => setActiveTab('public')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'public' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>VISUALIZAÇÃO GERAL</button>
            <button onClick={() => setActiveTab('manager')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'manager' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              {!isManagerAuthenticated && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}PAINEL DO GESTOR
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-grow p-4 lg:p-6 max-w-[1600px] mx-auto w-full relative">
        {!isConnected && (
          <div className="fixed bottom-4 right-4 z-[100] animate-bounce">
            <button onClick={requestSync} className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 border-2 border-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ERRO DE CONEXÃO - CLIQUE PARA RECONECTAR
            </button>
          </div>
        )}

        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando dados...</p>
          </div>
        ) : activeTab === 'public' ? (
          <StaffScheduleView servers={sortedServers} units={sortedUnits} assignments={assignments} holidays={holidays} />
        ) : !isManagerAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md text-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Acesso Restrito</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Senha do Gestor" autoFocus className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-indigo-100 outline-none text-center tracking-widest" />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Entrar</button>
              </form>
            </div>
          </div>
        ) : (
          <ManagerView 
            servers={sortedServers} 
            units={sortedUnits} 
            assignments={assignments} 
            holidays={holidays} 
            onAddServer={addServer} 
            onRemoveServer={removeServer} 
            onToggleServerStatus={toggleServerStatus} 
            onAddUnit={addUnit} 
            onRemoveUnit={removeUnit} 
            onUpdateUnitMetadata={updateUnitMetadata} 
            onBulkUpdateUnits={bulkUpdateUnits}
            onSetAssignment={setAssignment} 
            onUpdateHolidays={updateHolidays} 
            onLogout={() => {setIsManagerAuthenticated(false); setActiveTab('public');}} 
            onUpdateManagerPassword={handleUpdatePassword} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
