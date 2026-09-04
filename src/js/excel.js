/**
 * BURRACO - EXCEL & DATA I/O MODULE
 * Import from raw text/Excel paste, export to formatted XLSX, and JSON backups.
 */

const BurracoExcel = {
  /**
   * Parse multiline text pasted from Excel, Word, or plain text.
   * Strips table/row prefixes like "Tavolo 1: ", "1. ", "1 - "
   */
  parseBulkPaste(text = '', autoNumber = false, startLot = 1, roundsCount = 4) {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split(/\r?\n/);
    let currentLot = startLot;
    const result = [];

    lines.forEach((rawLine, idx) => {
      let line = rawLine.trim();
      if (!line) return;

      // Clean up leading numbers or table prefixes like "Tavolo 1: ", "1. ", "1 - "
      line = line.replace(/^(?:Tavolo\s*\d+[\s:\-]+|\d+[\s\.\)\-:]+)/i, '').trim();
      if (!line) return;

      const newPair = {
        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '_' + idx,
        lotNumber: autoNumber ? currentLot++ : null,
        name: line,
        scores: Array.from({ length: roundsCount }, () => ({ mp: null, vp: null }))
      };

      result.push(newPair);
    });

    return result;
  },

  /**
   * Generate and download Excel workbook (.xlsx) with Classifica and Tabellone Turni.
   */
  exportToExcel(state, rankedPairs = []) {
    if (typeof XLSX === 'undefined') {
      alert('Libreria Excel non ancora caricata. Riprova tra qualche istante.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Classifica Generale
      const leaderboardData = [
        ['BURRACO - CLASSIFICA GENERALE UFFICIALE'],
        ['Torneo:', state.title || 'Torneo di Burraco'],
        ['Data:', new Date().toLocaleDateString('it-IT')],
        [],
        ['Posizione', 'N° Estratto', 'Coppia / Giocatori', 'Totale VP', 'Totale MP', 'Distacco 1°']
      ];

      const leaderVP = rankedPairs[0]?.totVP || 0;
      rankedPairs.forEach((p, idx) => {
        leaderboardData.push([
          idx + 1,
          p.lotNumber || '',
          p.name,
          p.totVP,
          p.totMP,
          idx === 0 ? '—' : `-${leaderVP - p.totVP}`
        ]);
      });

      const wsLeaderboard = XLSX.utils.aoa_to_sheet(leaderboardData);
      XLSX.utils.book_append_sheet(wb, wsLeaderboard, 'Classifica');

      // Sheet 2: Tabellone Completo Turni
      const masterHeader = ['Pos.', 'N°', 'Coppia'];
      for (let r = 0; r < state.roundsCount; r++) {
        masterHeader.push(`T${r + 1} MP`, `T${r + 1} VP`);
      }
      masterHeader.push('Totale VP', 'Totale MP');

      const masterData = [
        ['BURRACO - TABELLONE COMPLETO DI TUTTI I TURNI'],
        ['Torneo:', state.title || 'Torneo di Burraco'],
        [],
        masterHeader
      ];

      rankedPairs.forEach((p, idx) => {
        const row = [idx + 1, p.lotNumber || '', p.name];
        for (let r = 0; r < state.roundsCount; r++) {
          const sc = (p.scores && p.scores[r]) || {};
          row.push(sc.mp !== null && sc.mp !== undefined ? sc.mp : '', sc.vp !== null && sc.vp !== undefined ? sc.vp : '');
        }
        row.push(p.totVP, p.totMP);
        masterData.push(row);
      });

      const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
      XLSX.utils.book_append_sheet(wb, wsMaster, 'Tabellone Completo');

      const safeTitle = (state.title || 'torneo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${safeTitle}_risultati.xlsx`;

      // Native PyWebView file dialog or browser fallback
      if (typeof window !== 'undefined' && window.pywebview && window.pywebview.api && window.pywebview.api.export_excel_native) {
        const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        window.pywebview.api.export_excel_native(fileName, base64Data).then(res => {
          if (res && res.success) {
            alert(`File Excel salvato con successo: ${res.path}`);
          }
        });
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (e) {
      console.error('Errore export Excel:', e);
      alert('Si è verificato un errore durante la generazione del file Excel.');
    }
  },

  /**
   * Export JSON Backup to disk.
   */
  exportBackupJSON(state) {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    try {
      if (!state.allGiornate) state.allGiornate = {};
      const curKey = state.currentGiornataKey || `giornata_${utils.getDateGGMMAA()}`;
      state.allGiornate[curKey] = {
        roundsCount: state.roundsCount,
        pairs: state.pairs
      };

      const fileData = {
        title: state.title
      };

      const sortedKeys = Object.keys(state.allGiornate)
        .filter(k => /^giornata_/i.test(k))
        .sort((a, b) => utils.parseSortKey(a).localeCompare(utils.parseSortKey(b)));

      sortedKeys.forEach(k => {
        fileData[k] = state.allGiornate[k];
      });

      const dataStr = JSON.stringify(fileData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (state.title || 'torneo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = utils.getDateGGMMAA();
      a.href = url;
      a.download = `${safeTitle}_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (e) {
      console.error('Errore export JSON:', e);
      alert('Si è verificato un errore durante il salvataggio del backup.');
    }
  }
};

if (typeof window !== 'undefined') {
  window.BurracoExcel = BurracoExcel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoExcel;
}
