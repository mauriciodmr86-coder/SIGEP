
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Server, Assignment, Holiday, DAYS, DayOfWeek, Unit, UnitDivision } from '../../types';

const getSubParts = (division: UnitDivision): { suffix: string; label: string }[] => {
  if (division === 'even_odd') return [{ suffix: 'even', label: 'PARES' }, { suffix: 'odd', label: 'ÍMPARES' }];
  if (division === 'digits') return [{ suffix: 'd1', label: 'DÍG. 0, 1, 2, 3' }, { suffix: 'd2', label: 'DÍG. 4, 5, 6' }, { suffix: 'd3', label: 'DÍG. 7, 8, 9' }];
  if (division === 'digits_pair') return [{ suffix: 'p1', label: 'DÍG. 0, 1' }, { suffix: 'p2', label: 'DÍG. 2, 3' }, { suffix: 'p3', label: 'DÍG. 4, 5' }, { suffix: 'p4', label: 'DÍG. 6, 7' }, { suffix: 'p5', label: 'DÍG. 8, 9' }];
  return [{ suffix: '', label: '' }];
};

const getAssignmentsForServer = (serverId: string, day: string, assignments: Assignment[], units: Unit[]) => {
  const results: { unitName: string, type: 'Titular' | 'Substituto' }[] = [];
  assignments.filter(a => a.day === day).forEach(a => {
    const baseUnitId = a.unitId.split(':')[0];
    const unit = units.find(u => u.id === baseUnitId);
    if (unit) {
      const subPartKey = a.unitId.split(':')[1] || '';
      const parts = getSubParts(unit.division);
      const part = parts.find(p => p.suffix === subPartKey);
      const displayName = part?.label ? `${unit.name} (${part.label})` : unit.name;
      if (a.substituteId === serverId) results.push({ unitName: displayName, type: 'Substituto' });
      else if (a.substituteId === null && a.titularId === serverId) results.push({ unitName: displayName, type: 'Titular' });
    }
  });
  return results;
};

const isHoliday = (serverId: string, day: DayOfWeek, holidays: Holiday[]) => {
  const dayHoliday = holidays.find(h => h.day === day);
  if (!dayHoliday) return false;
  return dayHoliday.isGlobal || dayHoliday.serverIds.includes(serverId);
};

export const generateSchedulePDF = (servers: Server[], units: Unit[], assignments: Assignment[], holidays: Holiday[]) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('SIGEP - Sistema Integrado de Gestão e Planejamento', 14, 15);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

  const tableHeaders = [['Servidor', ...DAYS]];
  const tableData = servers.map(server => {
    const row = [server.name];
    DAYS.forEach(day => {
      if (isHoliday(server.id, day as DayOfWeek, holidays)) row.push('FERIADO / FOLGA');
      else if (server.status === 'off') row.push(`OFF: ${server.offReason || 'AUSENTE'}`);
      else {
        const items = getAssignmentsForServer(server.id, day, assignments, units);
        if (items.length === 0) row.push('—');
        else row.push(items.map(i => `${i.unitName} (${i.type})`).join('\n'));
      }
    });
    return row;
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        const content = data.cell.text[0];
        if (content === 'FERIADO / FOLGA') {
          data.cell.styles.fillColor = [238, 242, 255];
          data.cell.styles.textColor = [67, 56, 202];
          data.cell.styles.fontStyle = 'bold';
        } else if (content.startsWith('OFF:')) {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    }
  });

  return doc;
};
