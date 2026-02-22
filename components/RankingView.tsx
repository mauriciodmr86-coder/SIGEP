
import React, { useState, useMemo, useEffect } from 'react';
import { Unit, Difficulty, Workload, UnitDivision, Server, Assignment } from '../types';
import { ArrowUp, ArrowDown, Hash, LayoutList, Trophy, User, Calculator, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  units: Unit[];
  servers: Server[];
  assignments: Assignment[];
  onUpdateUnitMetadata: (unitId: string, metadata: { difficulty?: Difficulty | null, workload?: Workload | null, division?: UnitDivision, processes?: number }) => void;
  onBulkUpdateUnits?: (updates: { id: string, processes: number }[]) => void;
  onBack: () => void;
}

const UnitRankingRow: React.FC<{
  unit: Unit;
  index: number;
  onUpdate: (id: string, val: number) => void;
}> = ({ unit, index, onUpdate }) => {
  const [localValue, setLocalValue] = useState(unit.processes || 0);

  useEffect(() => {
    setLocalValue(unit.processes || 0);
  }, [unit.processes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setLocalValue(0);
      return;
    }
    const positiveVal = Math.max(0, val);
    setLocalValue(positiveVal);
  };

  const handleBlur = () => {
    onUpdate(unit.id, localValue);
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-4 py-3 text-center">
        <span className={`text-xs font-black ${index < 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
          {index + 1}º
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-black text-slate-700 text-xs uppercase">{unit.name}</span>
      </td>
      <td className="px-4 py-3">
        <input 
          type="number" 
          min="0"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full px-3 py-1.5 bg-slate-50 border border-transparent group-hover:border-slate-200 rounded-xl text-center font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
        />
      </td>
    </tr>
  );
};

export const RankingView: React.FC<Props> = ({ units, servers, assignments, onUpdateUnitMetadata, onBulkUpdateUnits, onBack }) => {
  const [unitSortOrder, setUnitSortOrder] = useState<'asc' | 'desc'>('desc');
  const [serverSortOrder, setServerSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estado para manter a ordem das unidades estável enquanto o usuário edita
  const [orderedUnitIds, setOrderedUnitIds] = useState<string[]>([]);

  // Inicializa a ordem na primeira vez que as unidades carregam
  useEffect(() => {
    if (orderedUnitIds.length === 0 && units.length > 0) {
      const initialOrder = [...units]
        .sort((a, b) => (b.processes || 0) - (a.processes || 0))
        .map(u => u.id);
      setOrderedUnitIds(initialOrder);
    }
  }, [units, orderedUnitIds.length]);

  // Função para reordenar apenas quando o botão for clicado
  const handleSortUnits = () => {
    const newOrder = unitSortOrder === 'asc' ? 'desc' : 'asc';
    setUnitSortOrder(newOrder);
    
    const sortedIds = [...units].sort((a, b) => {
      const valA = a.processes || 0;
      const valB = b.processes || 0;
      return newOrder === 'asc' ? valA - valB : valB - valA;
    }).map(u => u.id);
    
    setOrderedUnitIds(sortedIds);
  };

  const displayUnits = useMemo(() => {
    // Mapeia os IDs ordenados para os objetos de unidade atuais (com valores atualizados)
    // Se houver unidades novas que não estão no orderedUnitIds, elas aparecem no fim
    const ordered = orderedUnitIds
      .map(id => units.find(u => u.id === id))
      .filter((u): u is Unit => !!u);
    
    const remaining = units.filter(u => !orderedUnitIds.includes(u.id));
    return [...ordered, ...remaining];
  }, [units, orderedUnitIds]);

  // Estado para manter a ordem dos servidores estável
  const [orderedServerIds, setOrderedServerIds] = useState<string[]>([]);

  // Ranking bruto (calculado em tempo real para ter os valores, mas a ordem vem do orderedServerIds)
  const rawServerRanking = useMemo(() => {
    return servers.map(server => {
      const assignedUnitIds = new Set<string>();
      assignments.forEach(a => {
        if (a.titularId === server.id || a.substituteId === server.id) {
          assignedUnitIds.add(a.unitId);
        }
      });

      let totalProcesses = 0;
      assignedUnitIds.forEach(fullId => {
        const baseId = fullId.split(':')[0];
        const unit = units.find(u => u.id === baseId);
        if (unit && unit.processes) {
          let divisor = 1;
          if (unit.division === 'even_odd') divisor = 2;
          else if (unit.division === 'digits') divisor = 3;
          else if (unit.division === 'digits_pair') divisor = 5;
          
          totalProcesses += unit.processes / divisor;
        }
      });

      return {
        ...server,
        totalProcesses: Math.round(totalProcesses)
      };
    });
  }, [servers, units, assignments]);

  // Inicializa a ordem dos servidores
  useEffect(() => {
    if (orderedServerIds.length === 0 && rawServerRanking.length > 0) {
      const initialOrder = [...rawServerRanking]
        .sort((a, b) => b.totalProcesses - a.totalProcesses)
        .map(s => s.id);
      setOrderedServerIds(initialOrder);
    }
  }, [rawServerRanking, orderedServerIds.length]);

  const handleSortServers = () => {
    const newOrder = serverSortOrder === 'asc' ? 'desc' : 'asc';
    setServerSortOrder(newOrder);
    
    const sortedIds = [...rawServerRanking].sort((a, b) => {
      return newOrder === 'asc' ? a.totalProcesses - b.totalProcesses : b.totalProcesses - a.totalProcesses;
    }).map(s => s.id);
    
    setOrderedServerIds(sortedIds);
  };

  const displayServers = useMemo(() => {
    const ordered = orderedServerIds
      .map(id => rawServerRanking.find(s => s.id === id))
      .filter((s): s is (Server & { totalProcesses: number }) => !!s);
    
    const remaining = rawServerRanking.filter(s => !orderedServerIds.includes(s.id));
    return [...ordered, ...remaining];
  }, [rawServerRanking, orderedServerIds]);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert("Planilha vazia ou formato inválido.");
          return;
        }

        // Tentar identificar colunas
        const firstRow = data[0];
        const keys = Object.keys(firstRow);
        
        const unitKey = keys.find(k => 
          k.toLowerCase().includes('unidade') || 
          k.toLowerCase().includes('cidade') || 
          k.toLowerCase().includes('comarca') ||
          k.toLowerCase().includes('nome') ||
          k.toLowerCase().includes('camarca')
        );
        
        const organKey = keys.find(k => 
          k.toLowerCase().includes('órgão') || 
          k.toLowerCase().includes('orgao') || 
          k.toLowerCase().includes('vara') ||
          k.toLowerCase().includes('juizado')
        );
        
        const processKey = keys.find(k => 
          k.toLowerCase().includes('processo') || 
          k.toLowerCase().includes('qtd') || 
          k.toLowerCase().includes('total') ||
          k.toLowerCase().includes('quantidade') ||
          k.toLowerCase().includes('número') ||
          k.toLowerCase().includes('numero')
        );

        if (!unitKey || !processKey) {
          alert(`Não foi possível identificar as colunas automaticamente.\nColunas encontradas: ${keys.join(', ')}\n\nCertifique-se que existam colunas como "Comarca" e "Processos".`);
          return;
        }

        // Agregar processos por combinação de Comarca + Órgão
        const aggregatedData: Record<string, { name: string, organ: string, total: number }> = {};
        data.forEach(row => {
          const rawName = String(row[unitKey] || '').toUpperCase().trim();
          const rawOrgan = organKey ? String(row[organKey] || '').toUpperCase().trim() : '';
          const val = parseInt(row[processKey], 10);
          
          if (rawName && !isNaN(val)) {
            const key = `${rawName}|${rawOrgan}`;
            if (!aggregatedData[key]) {
              aggregatedData[key] = { name: rawName, organ: rawOrgan, total: 0 };
            }
            aggregatedData[key].total += val;
          }
        });

        const updates: { id: string, processes: number }[] = [];
        const matchedNames: string[] = [];
        const unmatchedNames: string[] = [];

        Object.values(aggregatedData).forEach(({ name: rowUnitName, organ: rowOrgan, total: totalProcesses }) => {
          // 1. Tenta match exato com o nome da unidade
          let unit = units.find(u => u.name.toUpperCase().trim() === rowUnitName);
          
          // 2. Se não achou, e temos Órgão (JEC/JEFAZ), tenta combinar
          if (!unit && rowOrgan) {
            const combined = `${rowOrgan} ${rowUnitName}`;
            const combinedRev = `${rowUnitName} ${rowOrgan}`;
            unit = units.find(u => 
              u.name.toUpperCase().trim() === combined || 
              u.name.toUpperCase().trim() === combinedRev
            );
          }

          // 3. Se ainda não achou, tenta match parcial inteligente
          if (!unit) {
            const candidates = units.filter(u => {
              const uName = u.name.toUpperCase().trim();
              return uName.includes(rowUnitName) || rowUnitName.includes(uName);
            });

            if (candidates.length === 1) {
              unit = candidates[0];
            } else if (candidates.length > 1) {
              // Se houver múltiplos (ex: JEC e JEFAZ), tenta desempatar pelo Órgão
              const organMatch = candidates.find(u => {
                const uName = u.name.toUpperCase().trim();
                return rowOrgan && (uName.includes(rowOrgan) || rowOrgan.includes(uName));
              });
              unit = organMatch || candidates[0]; // Pega o primeiro se não desempatar
            }
          }

          if (unit) {
            updates.push({ id: unit.id, processes: totalProcesses });
            matchedNames.push(unit.name);
          } else {
            unmatchedNames.push(rowUnitName + (rowOrgan ? ` (${rowOrgan})` : ''));
          }
        });

        if (updates.length > 0) {
          if (onBulkUpdateUnits) {
            onBulkUpdateUnits(updates);
          } else {
            updates.forEach(upd => onUpdateUnitMetadata(upd.id, { processes: upd.processes }));
          }
          
          let message = `Sucesso! ${matchedNames.length} unidades atualizadas.\n`;
          if (unmatchedNames.length > 0) {
            message += `\nNão encontradas no sistema (${unmatchedNames.length}): ${unmatchedNames.slice(0, 5).join(', ')}${unmatchedNames.length > 5 ? '...' : ''}`;
          }
          alert(message);
          
          // Forçar reordenação após importação
          const sortedIds = [...units].map(u => {
            const upd = updates.find(x => x.id === u.id);
            return { ...u, processes: upd ? upd.processes : (u.processes || 0) };
          }).sort((a, b) => b.processes - a.processes).map(u => u.id);
          setOrderedUnitIds(sortedIds);
        } else {
          alert("Nenhuma unidade correspondente encontrada na planilha.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao ler a planilha. Verifique o formato do arquivo.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-indigo-600" />
            Central de Rankings
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Análise de produtividade e carga de trabalho</p>
        </div>
        <div className="flex gap-3">
          <label className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            <Upload className="w-4 h-4" />
            Importar Planilha
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={handleImportExcel}
            />
          </label>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-indigo-500" />
              Por Unidade
            </h3>
            <button 
              onClick={handleSortUnits}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              {unitSortOrder === 'asc' ? <ArrowUp className="w-4 h-4 text-slate-400" /> : <ArrowDown className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] w-12 text-center">#</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px]">Unidade</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-center w-32">Processos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayUnits.map((unit, index) => (
                  <UnitRankingRow 
                    key={unit.id} 
                    unit={unit} 
                    index={index} 
                    onUpdate={(id, val) => onUpdateUnitMetadata(id, { processes: val })} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Por Servidor
            </h3>
            <button 
              onClick={handleSortServers}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              {serverSortOrder === 'asc' ? <ArrowUp className="w-4 h-4 text-slate-400" /> : <ArrowDown className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] w-12 text-center">#</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px]">Servidor</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-center w-32">Total Proc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayServers.map((server, index) => (
                  <tr key={server.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-black ${index < 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {index + 1}º
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="w-3 h-3 text-amber-500" />}
                        <span className="font-black text-slate-700 text-xs uppercase">{server.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Hash className="w-3 h-3 text-slate-300" />
                        <span className="font-black text-sm text-slate-700">{server.totalProcesses}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
              * O cálculo considera a divisão da unidade: Unidades inteiras (100%), Par/Ímpar (50%), Dígitos 3 (33%) e Dígitos 5 (20%). 
              A soma é baseada em todas as unidades onde o servidor atua como titular ou substituto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


