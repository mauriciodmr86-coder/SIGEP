
import React, { useState } from 'react';
import { Server, Unit, Assignment, DAYS, Difficulty, Workload, UnitDivision, Holiday, DayOfWeek } from '../types';
import { generateSchedulePDF } from '../src/services/pdfService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Search } from 'lucide-react';

interface Props {
  servers: Server[];
  units: Unit[];
  assignments: Assignment[];
  holidays: Holiday[];
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

export const StaffScheduleView: React.FC<Props> = ({ servers, units, assignments, holidays }) => {
  const [filter, setFilter] = useState('');

  const getAssignmentsForServer = (serverId: string, day: string) => {
    const results: { unitId: string, unitName: string, difficulty?: Difficulty, workload?: Workload, type: 'Titular' | 'Substituto' }[] = [];
    
    assignments.filter(a => a.day === day).forEach(a => {
      const baseUnitId = a.unitId.split(':')[0];
      const unit = units.find(u => u.id === baseUnitId);
      
      if (unit) {
        const subPartKey = a.unitId.split(':')[1] || '';
        const parts = getSubParts(unit.division);
        const part = parts.find(p => p.suffix === subPartKey);
        const displayName = part?.label ? `${unit.name} (${part.label})` : unit.name;

        if (a.substituteId === serverId) {
          results.push({ unitId: unit.id, unitName: displayName, difficulty: unit.difficulty, workload: unit.workload, type: 'Substituto' });
        } else if (a.substituteId === null && a.titularId === serverId) {
          results.push({ unitId: unit.id, unitName: displayName, difficulty: unit.difficulty, workload: unit.workload, type: 'Titular' });
        }
      }
    });
    
    return results;
  };

  const isHoliday = (serverId: string, day: DayOfWeek) => {
    const dayHoliday = holidays.find(h => h.day === day);
    if (!dayHoliday) return false;
    return dayHoliday.isGlobal || dayHoliday.serverIds.includes(serverId);
  };

  const exportToPDF = () => {
    const doc = generateSchedulePDF(servers, units, assignments, holidays);
    doc.save(`escala_semanal_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Escala Semanal</h2>
          <p className="text-slate-500 font-medium italic">Confira as unidades designadas a você por dia.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportToPDF}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold text-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            BAIXAR PDF
          </button>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filtrar seu nome..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm w-full md:w-64 font-bold"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs sticky left-0 bg-slate-900 z-20 w-[200px]">Servidor</th>
                {DAYS.map(day => (
                  <th key={day} className="px-4 py-3 font-bold uppercase tracking-wider text-xs text-center border-l border-slate-700">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredServers.map(server => (
                <tr key={server.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col">
                      <p className="font-black text-slate-800 text-sm uppercase">{server.name || 'NÃO INFORMADO'}</p>
                      <span className={`text-[9px] font-bold uppercase ${server.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {server.status === 'active' ? 'Ativo (ON)' : `OFF: ${server.offReason || 'Ausente'}`}
                      </span>
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const assignedItems = getAssignmentsForServer(server.id, day);
                    const holiday = isHoliday(server.id, day);

                    return (
                      <td key={day} className={`px-3 py-2 border-l border-slate-200 min-w-[160px] ${holiday ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex flex-col gap-1.5">
                          {holiday ? (
                            <div className="text-center py-2 text-[10px] text-indigo-700 font-black bg-indigo-100/50 rounded-lg border-2 border-dashed border-indigo-200 uppercase tracking-widest shadow-inner">
                              Feriado ou Folga
                            </div>
                          ) : server.status === 'off' ? (
                            <div className="text-center py-1.5 text-[10px] text-rose-300 font-black bg-rose-50 rounded italic uppercase border border-rose-100">
                              {server.offReason || 'AUSENTE'}
                            </div>
                          ) : assignedItems.length > 0 ? (
                            assignedItems.map((item, idx) => (
                              <div key={idx} className={`p-2 rounded-lg border text-[10px] flex flex-col shadow-sm transition-all hover:shadow-md ${item.type === 'Titular' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-amber-50 border-amber-200 text-amber-800 ring-1 ring-amber-100'}`}>
                                <span className="font-black uppercase truncate">{item.unitName}</span>
                                <div className="flex justify-between items-end mt-0.5">
                                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 italic">{item.type}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-200 text-center font-bold text-lg opacity-20">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
