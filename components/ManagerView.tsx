
import React, { useState, useMemo } from 'react';
import { Server, Unit, Assignment, DayOfWeek, DAYS, Difficulty, Workload, UnitDivision, Holiday } from '../types';
import { generateSchedulePDF } from '../src/services/pdfService';
import { RankingView } from './RankingView';
import { Trophy } from 'lucide-react';

interface Props {
  servers: Server[];
  units: Unit[];
  assignments: Assignment[];
  holidays: Holiday[];
  onAddServer: (name: string) => void;
  onRemoveServer: (id: string) => void;
  onToggleServerStatus: (id: string, reason?: string) => void;
  onAddUnit: (name: string, division: UnitDivision) => void;
  onRemoveUnit: (id: string) => void;
  onUpdateUnitMetadata: (unitId: string, metadata: { difficulty?: Difficulty | null, workload?: Workload | null, division?: UnitDivision, processes?: number }) => void;
  onBulkUpdateUnits: (updates: { id: string, processes: number }[]) => void;
  onSetAssignment: (unitId: string, day: DayOfWeek, type: 'titular' | 'substitute', serverId: string | null) => void;
  onUpdateHolidays: (holidays: Holiday[]) => void;
  onLogout: () => void;
  onUpdateManagerPassword: (newPass: string) => void;
}

const getSubParts = (division: UnitDivision): { suffix: string; label: string }[] => {
  if (division === 'even_odd') return [
    { suffix: 'even', label: 'PARES' },
    { suffix: 'odd', label: 'ÍMPARES' }
  ];
  if (division === 'digits') return [
    { suffix: 'd1', label: 'DÍG. 0, 1, 2, 3' },
    { suffix: 'd2', label: 'DÍG. 4, 5, 6' },
    { suffix: 'd3', label: 'DÍG. 7, 8, 9' }
  ];
  if (division === 'digits_pair') return [
    { suffix: 'p1', label: 'DÍG. 0, 1' },
    { suffix: 'p2', label: 'DÍG. 2, 3' },
    { suffix: 'p3', label: 'DÍG. 4, 5' },
    { suffix: 'p4', label: 'DÍG. 6, 7' },
    { suffix: 'p5', label: 'DÍG. 8, 9' }
  ];
  return [{ suffix: '', label: '' }];
};

export const ManagerView: React.FC<Props> = ({
  servers,
  units,
  assignments,
  holidays,
  onAddServer,
  onRemoveServer,
  onToggleServerStatus,
  onAddUnit,
  onRemoveUnit,
  onUpdateUnitMetadata,
  onBulkUpdateUnits,
  onSetAssignment,
  onUpdateHolidays,
  onLogout,
  onUpdateManagerPassword,
}) => {
  const [newServerName, setNewServerName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDivision, setNewUnitDivision] = useState<UnitDivision>('normal');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [unitFilter, setUnitFilter] = useState('');
  const [offReasons, setOffReasons] = useState<Record<string, string>>({});
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassValue, setNewPassValue] = useState('');

  const unitRanking = useMemo(() => 
    [...units].sort((a, b) => (b.processes || 0) - (a.processes || 0)),
    [units]
  );

  const getUnitRank = (unitId: string) => {
    const index = unitRanking.findIndex(u => u.id === unitId);
    return index !== -1 ? index + 1 : '-';
  };

  const filteredUnits = useMemo(() => 
    units.filter(u => u.name.toLowerCase().includes(unitFilter.toLowerCase())),
    [units, unitFilter]
  );

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newServerName.trim()) {
      onAddServer(newServerName.trim());
      setNewServerName('');
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUnitName.trim()) {
      onAddUnit(newUnitName.trim(), newUnitDivision);
      setNewUnitName('');
      setNewUnitDivision('normal');
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassValue.trim()) {
      onUpdateManagerPassword(newPassValue.trim());
      setIsChangingPassword(false);
      setNewPassValue('');
      alert("Senha alterada com sucesso!");
    }
  };

  const setWeeklyAssignment = (unitId: string, type: 'titular' | 'substitute', serverId: string | null) => {
    DAYS.forEach(day => {
      onSetAssignment(unitId, day, type, serverId);
    });
  };

  const toggleGlobalHoliday = (day: DayOfWeek) => {
    const existing = holidays.find(h => h.day === day);
    if (existing) {
      if (existing.isGlobal) {
        // Se já era global, removemos o feriado deste dia
        onUpdateHolidays(holidays.filter(h => h.day !== day));
      } else {
        // Se era setorial, vira global
        onUpdateHolidays(holidays.map(h => h.day === day ? { ...h, isGlobal: true, serverIds: [] } : h));
      }
    } else {
      // Cria novo feriado global
      onUpdateHolidays([...holidays, { day, isGlobal: true, serverIds: [] }]);
    }
  };

  const toggleServerInHoliday = (day: DayOfWeek, serverId: string) => {
    const existing = holidays.find(h => h.day === day);
    if (existing) {
      if (existing.isGlobal) return; // Se é global, não faz sentido individual
      const serverExists = existing.serverIds.includes(serverId);
      let newServerIds = [];
      if (serverExists) {
        newServerIds = existing.serverIds.filter(id => id !== serverId);
      } else {
        newServerIds = [...existing.serverIds, serverId];
      }
      
      if (newServerIds.length === 0) {
        onUpdateHolidays(holidays.filter(h => h.day !== day));
      } else {
        onUpdateHolidays(holidays.map(h => h.day === day ? { ...h, serverIds: newServerIds } : h));
      }
    } else {
      onUpdateHolidays([...holidays, { day, isGlobal: false, serverIds: [serverId] }]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Painel do Gestor</h2>
            <p className="text-slate-500 font-medium italic">Gerencie escalas, subdivisões e servidores.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-2"
              title="Recarregar e Sincronizar"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Sincronizar
            </button>
            <button 
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all shadow-sm flex items-center gap-2 ${isChangingPassword ? 'bg-amber-600 border-amber-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {isChangingPassword ? 'Cancelar' : 'Trocar Senha'}
            </button>
            <button 
              onClick={onLogout}
              className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-all shadow-sm"
            >
              Sair
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <input 
            type="text" 
            placeholder="Buscar unidade..." 
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm w-full md:w-64 font-bold"
          />
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-tight transition-all border-2 ${
              showAdmin ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-900 text-white shadow-xl hover:bg-slate-800'
            }`}
          >
            {showAdmin ? 'FECHAR LISTAS' : 'GERENCIAR LISTAS'}
          </button>
          <button
            onClick={() => { setShowHolidays(!showHolidays); setShowRanking(false); }}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-tight transition-all border-2 ${
              showHolidays ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-indigo-600 border-indigo-600 text-white shadow-xl hover:bg-indigo-700'
            }`}
          >
            {showHolidays ? 'FECHAR FERIADOS E FOLGAS' : 'FERIADOS E FOLGAS'}
          </button>
          <button
            onClick={() => { setShowRanking(!showRanking); setShowHolidays(false); }}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-tight transition-all border-2 flex items-center gap-2 ${
              showRanking ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500 border-amber-500 text-white shadow-xl hover:bg-amber-600'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {showRanking ? 'FECHAR RANKING' : 'RANKING'}
          </button>
        </div>
      </div>

      {isChangingPassword && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl animate-fadeIn">
          <form onSubmit={handleSaveNewPassword} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-grow space-y-2">
              <label className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Nova Senha do Gestor</label>
              <input 
                type="text" 
                autoFocus
                value={newPassValue}
                onChange={(e) => setNewPassValue(e.target.value)}
                placeholder="Digite a nova senha..."
                className="w-full px-4 py-2 border border-amber-300 rounded-xl bg-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button type="submit" className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 transition-all">
              Confirmar Nova Senha
            </button>
          </form>
        </div>
      )}

      {showHolidays && (
        <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 p-6 rounded-3xl animate-fadeIn space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Gestão de Feriados ou Folgas</h3>
            <p className="text-xs text-indigo-600 font-bold italic">Selecione o dia e marque quem estará de feriado ou folga.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {DAYS.map(day => {
              const dayHoliday = holidays.find(h => h.day === day);
              return (
                <div key={day} className={`bg-white p-4 rounded-2xl border-2 transition-all ${dayHoliday ? 'border-indigo-400 shadow-md' : 'border-slate-100 shadow-sm'}`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 uppercase text-xs">{day}</span>
                      <button 
                        onClick={() => toggleGlobalHoliday(day)}
                        className={`text-[9px] font-black px-2 py-1 rounded transition-all ${dayHoliday?.isGlobal ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {dayHoliday?.isGlobal ? 'GERAL ATIVO' : 'TORNAR GERAL'}
                      </button>
                    </div>
                    
                    {!dayHoliday?.isGlobal && (
                      <div className="mt-2 space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Servidores Específicos:</label>
                        <div className="max-h-40 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                          {servers.map(s => (
                            <button
                              key={s.id}
                              onClick={() => toggleServerInHoliday(day, s.id)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${dayHoliday?.serverIds.includes(s.id) ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-500 border border-transparent hover:border-slate-200'}`}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {dayHoliday?.isGlobal && (
                      <div className="py-4 text-center">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 block">FOLGA GERAL</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRanking && (
        <RankingView 
          units={units} 
          servers={servers}
          assignments={assignments}
          onUpdateUnitMetadata={onUpdateUnitMetadata} 
          onBulkUpdateUnits={onBulkUpdateUnits}
          onBack={() => setShowRanking(false)} 
        />
      )}

      {showAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-slate-100 p-6 rounded-3xl border-2 border-dashed border-slate-300">
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase">Nova Unidade Base</h3>
            <form onSubmit={handleAddUnit} className="space-y-4 bg-white p-5 rounded-2xl border shadow-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Ex: Ijuí, Alvorada..."
                  className="flex-grow px-4 py-2.5 border rounded-xl text-sm font-black uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-indigo-700 transition-colors">Cadastrar</button>
              </div>
            </form>

            <div className="max-h-[250px] overflow-y-auto bg-white rounded-xl border p-2 text-[10px] font-bold uppercase grid grid-cols-1 md:grid-cols-2 gap-1 shadow-inner">
              {units.map(u => (
                <div key={u.id} className="p-2 bg-slate-50 flex justify-between items-center rounded border border-transparent hover:border-slate-200 group">
                  <span className="truncate pr-2">{u.name}</span>
                  <button onClick={() => onRemoveUnit(u.id)} className="text-rose-400 hover:text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">EXCLUIR</button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase">Lista de Servidores</h3>
            <form onSubmit={handleAddServer} className="flex gap-2 bg-white p-3 rounded-xl border">
              <input
                type="text"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Nome completo..."
                className="flex-grow px-4 py-2 border rounded-xl text-sm font-black uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl font-black text-[10px] uppercase">Add</button>
            </form>
            <div className="max-h-[350px] overflow-y-auto bg-white rounded-xl border p-2 space-y-2 shadow-inner">
              {servers.map(s => (
                <div key={s.id} className="p-2.5 bg-slate-50 rounded-xl flex flex-col gap-2 border transition-all hover:bg-white hover:shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-700">{s.name}</span>
                    <button onClick={() => onRemoveServer(s.id)} className="text-rose-400 text-[9px] font-black uppercase hover:text-rose-600 transition-colors">Remover</button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Motivo (OFF)"
                      value={offReasons[s.id] || s.offReason || ''}
                      onChange={(e) => setOffReasons({...offReasons, [s.id]: e.target.value})}
                      className="text-[9px] px-2 py-1.5 flex-grow border rounded-lg bg-white font-bold uppercase"
                    />
                    <button 
                      onClick={() => onToggleServerStatus(s.id, offReasons[s.id])}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${s.status === 'active' ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'}`}
                    >
                      {s.status === 'active' ? 'Pôr em OFF' : 'Pôr em ON'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 font-black uppercase tracking-widest text-[11px] sticky left-0 bg-slate-900 z-20 w-[300px]">Unidade / Divisão / Carga / Semana</th>
                {DAYS.map(day => (
                  <th key={day} className="px-4 py-3 font-black uppercase tracking-widest text-[11px] text-center border-l border-slate-700">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUnits.map(unit => {
                const parts = getSubParts(unit.division);
                return parts.map((part, pIdx) => {
                  const fullUnitId = part.suffix ? `${unit.id}:${part.suffix}` : unit.id;
                  const displayName = part.label ? `${unit.name} (${part.label})` : unit.name;

                  return (
                    <tr key={`${unit.id}-${part.suffix}`} className={`hover:bg-slate-50 group transition-colors ${pIdx < parts.length - 1 ? 'border-b border-dashed border-slate-200' : ''}`}>
                      <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)]">
                        <div className="space-y-2">
                          <div className="flex flex-col">
                             <span className="font-black text-slate-800 text-[11px] uppercase leading-tight">{displayName}</span>
                             {pIdx === 0 && (
                               <div className="flex gap-1 mt-1">
                                 {(['normal', 'even_odd', 'digits', 'digits_pair'] as UnitDivision[]).map(dv => (
                                   <button 
                                     key={dv}
                                     onClick={() => onUpdateUnitMetadata(unit.id, { division: dv })}
                                     className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border transition-all ${unit.division === dv ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                   >
                                     {dv === 'normal' ? 'Inteira' : dv === 'even_odd' ? 'Par/Ímpar' : dv === 'digits' ? 'Dígitos (3)' : 'Dígitos (5)'}
                                   </button>
                                 ))}
                               </div>
                             )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Ranking</span>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg ring-2 ring-indigo-100">
                                  {getUnitRank(unit.id)}º
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-700 uppercase">Posição</span>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{unit.processes || 0} Processos</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-slate-100">
                            <div className="flex flex-col gap-1 bg-indigo-50/50 p-1.5 rounded-xl border border-indigo-100/50">
                              <span className="text-[7px] font-black uppercase text-indigo-400 tracking-widest text-center">Atribuição Semanal</span>
                              <div className="grid grid-cols-2 gap-1">
                                <div className="space-y-0.5">
                                  <label className="text-[6px] font-black uppercase text-slate-400 block">Titular</label>
                                  <select 
                                    className="w-full text-[8px] font-bold p-0.5 rounded border bg-white focus:ring-1 focus:ring-indigo-500"
                                    onChange={(e) => setWeeklyAssignment(fullUnitId, 'titular', e.target.value || null)}
                                    value=""
                                  >
                                    <option value="" disabled>Definir...</option>
                                    <option value="">(Limpar)</option>
                                    {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[6px] font-black uppercase text-slate-400 block">Subs</label>
                                  <select 
                                    className="w-full text-[8px] font-bold p-0.5 rounded border bg-white focus:ring-1 focus:ring-amber-500"
                                    onChange={(e) => setWeeklyAssignment(fullUnitId, 'substitute', e.target.value || null)}
                                    value=""
                                  >
                                    <option value="" disabled>Definir...</option>
                                    <option value="">(Limpar)</option>
                                    {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const assignment = assignments.find(a => a.unitId === fullUnitId && a.day === day) || { titularId: null, substituteId: null };
                        const titular = servers.find(s => s.id === assignment.titularId);
                        const substitute = servers.find(s => s.id === assignment.substituteId);
                        
                        // Checar se titular ou substituto está de feriado
                        const isTitularHoliday = holidays.find(h => h.day === day && (h.isGlobal || (titular && h.serverIds.includes(titular.id))));
                        const isSubHoliday = holidays.find(h => h.day === day && (h.isGlobal || (substitute && h.serverIds.includes(substitute.id))));

                        const isTitularOff = titular?.status === 'off';

                        return (
                          <td key={day} className={`px-2 py-2 border-l border-slate-200 min-w-[180px] ${isTitularHoliday ? 'bg-indigo-50/20' : ''}`}>
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex justify-between">
                                  <span>Titular</span>
                                  {isTitularHoliday && <span className="text-indigo-600 font-black tracking-tighter">● FOLGA</span>}
                                  {!isTitularHoliday && isTitularOff && <span className="text-rose-500 font-black tracking-tighter animate-pulse">● OFF</span>}
                                </label>
                                <select
                                  value={assignment.titularId || ''}
                                  onChange={(e) => onSetAssignment(fullUnitId, day, 'titular', e.target.value || null)}
                                  className={`w-full text-[10px] font-black p-2 rounded-xl border appearance-none transition-all cursor-pointer ${isTitularHoliday ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : isTitularOff ? 'bg-rose-50 border-rose-300 text-rose-800' : assignment.titularId ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                >
                                  <option value="">(Vago)</option>
                                  {servers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} {s.status === 'off' ? '(OFF)' : ''}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex justify-between">
                                  <span>Substituto</span>
                                  {isSubHoliday && <span className="text-indigo-600 font-black tracking-tighter">● FOLGA</span>}
                                </label>
                                <select
                                  value={assignment.substituteId || ''}
                                  onChange={(e) => onSetAssignment(fullUnitId, day, 'substitute', e.target.value || null)}
                                  className={`w-full text-[10px] font-black p-2 rounded-xl border appearance-none transition-all cursor-pointer ${assignment.substituteId ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm ring-2 ring-amber-50' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                >
                                  <option value="">(Nenhum)</option>
                                  {servers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} {s.status === 'off' ? '(OFF)' : ''}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
