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

  _getConfig() {
    if (typeof window !== 'undefined' && window.BURRACO_CONFIG) return window.BURRACO_CONFIG;
    try { return require('./config'); } catch(e) { return {}; }
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
      const cfg = this._getConfig();
      const expCfg = cfg.export || {};
      const sheetLeaderboard = expCfg.sheetLeaderboard || 'Classifica';
      const sheetMaster = expCfg.sheetMaster || 'Tabellone Completo';
      const headerLeaderboard = expCfg.headerLeaderboard || 'BURRACO - CLASSIFICA GENERALE UFFICIALE';
      const headerMaster = expCfg.headerMaster || 'BURRACO - TABELLONE COMPLETO DI TUTTI I TURNI';
      const defaultTitle = cfg.defaultTournamentTitle || 'Torneo di Burraco';

      const wb = XLSX.utils.book_new();

      // Sheet 1: Classifica Generale
      const leaderboardData = [
        [headerLeaderboard],
        ['Torneo:', state.title || defaultTitle],
        ['Data:', (function() {
          if (state.currentGiornataKey) {
            const m = state.currentGiornataKey.match(/^serata_(\d{2})(\d{2})(\d{2})/);
            if (m) return `${m[1]}/${m[2]}/20${m[3]}`;
          }
          return new Date().toLocaleDateString('it-IT');
        })()],
        [],
        ['Posizione', 'Coppia / Giocatori', 'N° Estratto', 'Totale VP', 'Totale MP', 'Distacco 1°']
      ];

      const leaderVP = rankedPairs[0]?.totVP || 0;
      rankedPairs.forEach((p, idx) => {
        leaderboardData.push([
          idx + 1,
          p.name,
          p.lotNumber || '',
          p.totVP,
          p.totMP,
          idx === 0 ? '—' : `-${leaderVP - p.totVP}`
        ]);
      });

      const wsLeaderboard = XLSX.utils.aoa_to_sheet(leaderboardData);
      XLSX.utils.book_append_sheet(wb, wsLeaderboard, sheetLeaderboard);

      // Sheet 2: Tabellone Completo Turni
      const masterHeader = ['Pos.', 'Coppia', 'N°'];
      for (let r = 0; r < state.roundsCount; r++) {
        masterHeader.push(`T${r + 1} MP`, `T${r + 1} VP`);
      }
      masterHeader.push('Totale VP', 'Totale MP');

      const masterData = [
        [headerMaster],
        ['Torneo:', state.title || defaultTitle],
        [],
        masterHeader
      ];

      rankedPairs.forEach((p, idx) => {
        const row = [idx + 1, p.name, p.lotNumber || ''];
        for (let r = 0; r < state.roundsCount; r++) {
          const sc = (p.scores && p.scores[r]) || {};
          row.push(sc.mp !== null && sc.mp !== undefined ? sc.mp : '', sc.vp !== null && sc.vp !== undefined ? sc.vp : '');
        }
        row.push(p.totVP, p.totMP);
        masterData.push(row);
      });

      const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
      XLSX.utils.book_append_sheet(wb, wsMaster, sheetMaster);

      const filePrefix = expCfg.excelFilePrefix || 'torneo';
      const safeTitle = (state.title || filePrefix).replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
      const curKey = state.currentGiornataKey || `serata_${utils.getDateGGMMAA()}`;
      state.allGiornate[curKey] = {
        roundsCount: state.roundsCount,
        pairs: state.pairs
      };

      const fileData = {
        title: state.title
      };

      const sortedKeys = Object.keys(state.allGiornate)
        .filter(k => /^serata_/i.test(k))
        .sort((a, b) => utils.parseSortKey(a).localeCompare(utils.parseSortKey(b)));

      sortedKeys.forEach(k => {
        fileData[k] = state.allGiornate[k];
      });

      const dataStr = JSON.stringify(fileData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (state.title || 'torneo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = (state.currentGiornataKey && state.currentGiornataKey.replace(/^serata_/, '')) || utils.getDateGGMMAA();
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
  },

  /**
   * Genera e scarica l'immagine PNG ad alta risoluzione (HiDPI / Retina 2x)
   * della classifica del torneoe la copia contestualmente negli appunti
   * per la condivisione diretta su WhatsApp.
   */
  exportLeaderboardImage(state, rankedPairs = [], onComplete = null) {
    if (typeof document === 'undefined') return null;

    const validPairs = (rankedPairs || []).filter(p => p && p.name && p.name.trim() !== '');
    if (validPairs.length === 0) {
      if (typeof onComplete === 'function') {
        onComplete({ success: false, error: 'Nessuna coppia registrata da esportare.' });
      } else {
        alert('Nessuna coppia registrata da esportare.');
      }
      return null;
    }

    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    const cfg = this._getConfig();
    const defaultTitle = cfg.defaultTournamentTitle || 'Torneo di Burraco';
    const tournamentTitle = (state.title && state.title !== 'Torneo di Burraco') ? state.title : defaultTitle;
    const roundsCount = state.roundsCount || 4;

    let dateFormatted = '';
    if (state.currentGiornataKey) {
      const m = state.currentGiornataKey.match(/^serata_(\d{2})(\d{2})(\d{2})/);
      if (m) dateFormatted = `${m[1]}/${m[2]}/20${m[3]}`;
    }
    if (!dateFormatted) {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      dateFormatted = `${dd}/${mm}/${yyyy}`;
    }

    // 1. Dimensionamento colonne
    const colRankWidth = 60;
    const colLotWidth = 60;
    const colMpWidth = 72;
    const colVpWidth = 54;
    const roundTotalWidth = colMpWidth + colVpWidth; // 126px per turno
    const colTotVpWidth = 88;
    const colTotMpWidth = 100;

    // Misurazione dinamica della larghezza nome
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCtx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let maxNamePx = 180;
    validPairs.forEach(p => {
      const textWidth = testCtx.measureText(p.name).width;
      if (textWidth > maxNamePx) maxNamePx = textWidth;
    });
    const headerNameWidth = testCtx.measureText('Coppia / Giocatori').width;
    if (headerNameWidth > maxNamePx) maxNamePx = headerNameWidth;

    const colNameWidth = Math.min(380, Math.ceil(maxNamePx + 32));

    const tableWidth = colRankWidth + colNameWidth + colLotWidth + (roundsCount * roundTotalWidth) + colTotVpWidth + colTotMpWidth;
    const padX = 32;
    const padTop = 20;
    const padBottom = 24;
    const headerHeight = 56;
    const tableHeaderHeight = 52;
    const rowHeight = 40;
    const tableHeight = tableHeaderHeight + (validPairs.length * rowHeight);

    const canvasWidth = tableWidth + (padX * 2);
    const canvasHeight = padTop + headerHeight + tableHeight + padBottom;

    // 2. Rendering a scala 2x (HiDPI / Retina)
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Sfondo generale bianco pulito
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Intestazione Scheda - Sinistra: Titolo Torneo con indicatore Classifica
    const headerCenterY = padTop + 16;
    const displayTitle = `${tournamentTitle}  •  Classifica`;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTitle, padX, headerCenterY);

    // Intestazione Scheda - Angolo in alto a destra: Data
    const dateText = `Data: ${dateFormatted}`;
    ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const dateTextWidth = ctx.measureText(dateText).width;
    const badgePadH = 14;
    const badgeH = 28;
    const badgeW = dateTextWidth + (badgePadH * 2);
    const badgeX = padX + tableWidth - badgeW;
    const badgeY = headerCenterY - (badgeH / 2);

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dateText, badgeX + (badgeW / 2), badgeY + (badgeH / 2));

    // Separatore orizzontale
    const separatorY = headerCenterY + (badgeH / 2) + 14;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, separatorY);
    ctx.lineTo(padX + tableWidth, separatorY);
    ctx.stroke();

    // Inizio Tabella
    const tableX = padX;
    const tableY = padTop + headerHeight;

    // Sfondo intestazione tabella
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(tableX, tableY, tableWidth, tableHeaderHeight);

    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(tableX, tableY, tableWidth, tableHeaderHeight);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pos.
    ctx.fillText('POS.', tableX + (colRankWidth / 2), tableY + (tableHeaderHeight / 2));

    // Coppia / Giocatori
    ctx.textAlign = 'left';
    ctx.fillText('COPPIA / GIOCATORI', tableX + colRankWidth + 14, tableY + (tableHeaderHeight / 2));

    // N°
    ctx.textAlign = 'center';
    ctx.fillText('N°', tableX + colRankWidth + colNameWidth + (colLotWidth / 2), tableY + (tableHeaderHeight / 2));

    // Intestazioni Turni
    let curX = tableX + colRankWidth + colNameWidth + colLotWidth;
    for (let r = 0; r < roundsCount; r++) {
      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(curX, tableY, roundTotalWidth, tableHeaderHeight);

      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`TURNO ${r + 1}`, curX + (roundTotalWidth / 2), tableY + 13.5);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('MP', curX + (colMpWidth / 2), tableY + 39.5);
      ctx.fillText('VP', curX + colMpWidth + (colVpWidth / 2), tableY + 39.5);

      ctx.strokeStyle = '#E2EDFB';
      ctx.beginPath();
      ctx.moveTo(curX, tableY + 26);
      ctx.lineTo(curX + roundTotalWidth, tableY + 26);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(curX + colMpWidth, tableY + 26);
      ctx.lineTo(curX + colMpWidth, tableY + tableHeaderHeight);
      ctx.stroke();

      curX += roundTotalWidth;
    }

    // Totale VP
    ctx.fillStyle = '#EFF6FF';
    ctx.fillRect(curX, tableY, colTotVpWidth, tableHeaderHeight);
    ctx.fillStyle = '#1D4ED8';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOTALE VP', curX + (colTotVpWidth / 2), tableY + (tableHeaderHeight / 2));
    curX += colTotVpWidth;

    // Totale MP
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(curX, tableY, colTotMpWidth, tableHeaderHeight);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOTALE MP', curX + (colTotMpWidth / 2), tableY + (tableHeaderHeight / 2));

    // Righe Dati
    let rowY = tableY + tableHeaderHeight;

    validPairs.forEach((pair, idx) => {
      const rank = idx + 1;
      const isEven = idx % 2 === 1;

      // Sfondo riga zebra
      ctx.fillStyle = isEven ? '#F8FAFC' : '#FFFFFF';
      ctx.fillRect(tableX, rowY, tableWidth, rowHeight);

      // Sfondo Totale VP
      const totVpX = tableX + colRankWidth + colNameWidth + colLotWidth + (roundsCount * roundTotalWidth);
      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(totVpX, rowY, colTotVpWidth, rowHeight);

      // Linea orizzontale
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + rowHeight);
      ctx.lineTo(tableX + tableWidth, rowY + rowHeight);
      ctx.stroke();

      const centerY = rowY + (rowHeight / 2);

      // Pos. Badge / Testo
      const rankCenterX = tableX + (colRankWidth / 2);
      if (rank === 1) {
        ctx.fillStyle = '#FEF3C7';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rankCenterX, centerY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1°', rankCenterX, centerY);
      } else if (rank === 2) {
        ctx.fillStyle = '#F1F5F9';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rankCenterX, centerY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2°', rankCenterX, centerY);
      } else if (rank === 3) {
        ctx.fillStyle = '#FFEDD5';
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rankCenterX, centerY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#9A3412';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('3°', rankCenterX, centerY);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rank}°`, rankCenterX, centerY);
      }

      // Nome Coppia
      const nameLeftX = tableX + colRankWidth + 14;
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pair.name, nameLeftX, centerY);

      // N° Lot
      const lotCenterX = tableX + colRankWidth + colNameWidth + (colLotWidth / 2);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(pair.lotNumber || '—'), lotCenterX, centerY);

      // Punti per ciascun Turno (MP e VP)
      let rX = tableX + colRankWidth + colNameWidth + colLotWidth;
      for (let r = 0; r < roundsCount; r++) {
        const sc = (pair.scores && pair.scores[r]) || {};
        const mpVal = (sc.mp !== null && sc.mp !== undefined) ? Number(sc.mp).toLocaleString('it-IT') : '—';
        const vpVal = (sc.vp !== null && sc.vp !== undefined) ? String(sc.vp) : '—';

        ctx.fillStyle = (mpVal === '—') ? '#CBD5E1' : '#475569';
        ctx.font = '13.5px Consolas, -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mpVal, rX + (colMpWidth / 2), centerY + 1);

        ctx.fillStyle = (vpVal === '—') ? '#CBD5E1' : '#1D4ED8';
        ctx.font = 'bold 15px Consolas, -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vpVal, rX + colMpWidth + (colVpWidth / 2), centerY + 1);

        rX += roundTotalWidth;
      }

      // Totale VP
      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(pair.totVP || 0), totVpX + (colTotVpWidth / 2), centerY + 0.5);

      // Totale MP
      const totMpX = totVpX + colTotVpWidth;
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const totMpStr = (pair.totMP !== undefined && pair.totMP !== null) ? Number(pair.totMP).toLocaleString('it-IT') : '0';
      ctx.fillText(totMpStr, totMpX + (colTotMpWidth / 2), centerY + 0.5);

      rowY += rowHeight;
    });

    // Delimitatori verticali minori: separazione MP / VP all'interno di ciascun turno nelle righe dati
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r < roundsCount; r++) {
      const mpSepX = tableX + colRankWidth + colNameWidth + colLotWidth + (r * roundTotalWidth) + colMpWidth;
      ctx.moveTo(mpSepX, tableY + tableHeaderHeight);
      ctx.lineTo(mpSepX, tableY + tableHeight);
    }
    ctx.stroke();

    // Delimitatori verticali principali: separazione di tutte le colonne per l'intera altezza (header + dati)
    const majorColDividers = [
      tableX + colRankWidth, // dopo POS
      tableX + colRankWidth + colNameWidth, // dopo COPPIA
      tableX + colRankWidth + colNameWidth + colLotWidth // dopo N°
    ];

    let rDivX = tableX + colRankWidth + colNameWidth + colLotWidth;
    for (let r = 0; r < roundsCount; r++) {
      rDivX += roundTotalWidth;
      majorColDividers.push(rDivX); // dopo TURNO r
    }
    majorColDividers.push(rDivX + colTotVpWidth); // dopo TOTALE VP

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    majorColDividers.forEach(x => {
      ctx.moveTo(x, tableY);
      ctx.lineTo(x, tableY + tableHeight);
    });
    ctx.stroke();

    // Linea orizzontale di separazione sotto l'intestazione tabella
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + tableHeaderHeight);
    ctx.lineTo(tableX + tableWidth, tableY + tableHeaderHeight);
    ctx.stroke();

    // Bordo perimetrale esterno della tabella
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);

    // 3. Generazione Blob PNG, Download e Notifica (senza alert invasivo)
    canvas.toBlob((blob) => {
      if (!blob) {
        if (typeof onComplete === 'function') {
          onComplete({ success: false, error: 'Errore nella generazione dell\'immagine.' });
        } else {
          alert('Errore nella generazione dell\'immagine.');
        }
        return;
      }

      const dateStr = (state.currentGiornataKey && state.currentGiornataKey.replace(/^serata_/, '')) || (utils ? utils.getDateGGMMAA() : 'classifica');
      const safeTitle = tournamentTitle.replace(/[^a-z0-9]/gi, '_');
      const fileName = `Classifica_${safeTitle}_${dateStr}.png`;

      // Download automatico del file PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);

      let called = false;
      const notifyDone = (copied) => {
        if (called) return;
        called = true;
        if (typeof onComplete === 'function') {
          onComplete({ success: true, blob, fileName, copiedToClipboard: copied });
        } else if (typeof window !== 'undefined' && window.app && typeof window.app.showExportImageModal === 'function') {
          window.app.showExportImageModal({ blob, fileName, copiedToClipboard: copied });
        }
      };

      // Copia contestuale negli appunti per incolla diretto su WhatsApp Web (Ctrl+V)
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          const safetyTimer = setTimeout(() => notifyDone(false), 800);
          navigator.clipboard.write([item]).then(() => {
            clearTimeout(safetyTimer);
            notifyDone(true);
          }).catch(() => {
            clearTimeout(safetyTimer);
            notifyDone(false);
          });
          return;
        } catch (e) {}
      }

      notifyDone(false);
    }, 'image/png');
  }
};

if (typeof window !== 'undefined') {
  window.BurracoExcel = BurracoExcel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoExcel;
}
