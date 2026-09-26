/**
 * BURRACO - EXCEL & DATA I/O MODULE
 * Export to formatted XLSX, WhatsApp image generation, and JSON backups.
 */

const BurracoExcel = {

  _getConfig() {
    if (typeof window !== 'undefined' && window.BURRACO_CONFIG) return window.BURRACO_CONFIG;
    try { return require('./config'); } catch(e) { return {}; }
  },

  /**
   * Generate and download Excel workbook (.xlsx) with Classifica and Tabellone Turni.
   */
  /**
   * Genera e scarica il file Excel (.xlsx) con un unico foglio completo e ordinato:
   * Classifica, N° tavolo, tutti i turni disputati (MP e VP), totali ed eventuale premio.
   */
  exportToExcel(state, rankedPairs = []) {
    if (typeof XLSX === 'undefined') {
      alert('Libreria Excel non ancora caricata. Riprova tra qualche istante.');
      return;
    }

    try {
      const cfg = this._getConfig();
      const expCfg = cfg.export || {};
      const sheetName = expCfg.sheetLeaderboard || 'Classifica';
      const headerTitle = expCfg.headerLeaderboard || 'BURRACO - CLASSIFICA GENERALE TORNEO';
      const defaultTitle = cfg.defaultTournamentTitle || 'Torneo di Burraco';
      const tournamentTitle = state.title || defaultTitle;
      const roundsCount = state.roundsCount || 4;

      const wb = XLSX.utils.book_new();

      // Verifica se la colonna montepremi è abilitata
      const cfgPrize = (cfg && cfg.prizepool) || {};
      const showPrizepool = (state.settings && state.settings.showPrizepool !== undefined)
        ? !!state.settings.showPrizepool
        : (cfgPrize.showColumn === true);

      const prizeMap = {};
      if (showPrizepool) {
        const fee = (state.settings && state.settings.entryFeePerPlayer !== undefined)
          ? state.settings.entryFeePerPlayer
          : (cfgPrize.entryFeePerPlayer !== undefined ? cfgPrize.entryFeePerPlayer : 2);

        const pcts = (state.settings && state.settings.prizePercentages)
          ? state.settings.prizePercentages
          : (cfgPrize.percentages || [50, 30, 20, 0, 0]);

        const engine = (typeof window !== 'undefined' && window.BurracoEngine)
          ? window.BurracoEngine
          : (typeof require !== 'undefined' ? require('./engine') : null);

        if (engine && engine.calculatePrizepool) {
          const res = engine.calculatePrizepool(rankedPairs.length, fee, pcts);
          if (res && res.prizes) {
            res.prizes.forEach(p => {
              prizeMap[p.rank] = p.text;
            });
          }
        }
      }

      // Costruzione intestazione colonne
      const tableHeaders = ['Pos.', 'Coppia / Giocatori', 'N° Tavolo'];
      for (let r = 0; r < roundsCount; r++) {
        tableHeaders.push(`Turno ${r + 1} MP`, `Turno ${r + 1} VP`);
      }
      tableHeaders.push('Totale VP', 'Totale MP');
      if (showPrizepool) {
        tableHeaders.push('Premio (€)');
      }

      const totalCols = tableHeaders.length;

      // Data formattata per sottotitolo
      const formattedDate = (function() {
        if (state.currentGiornataKey) {
          const m = state.currentGiornataKey.match(/^serata_(\d{2})(\d{2})(\d{2})/);
          if (m) return `${m[1]}/${m[2]}/20${m[3]}`;
        }
        return new Date().toLocaleDateString('it-IT');
      })();

      const subtitle = `Torneo: ${tournamentTitle}   |   Data: ${formattedDate}   |   Turni Disputati: ${roundsCount}   |   Coppie Totali: ${rankedPairs.length}`;

      const sheetData = [
        [headerTitle],
        [subtitle],
        [],
        tableHeaders
      ];

      // Righe dati per ciascuna coppia classificata
      rankedPairs.forEach((p, idx) => {
        const rank = idx + 1;
        const row = [
          `${rank}°`,
          p.name || '—',
          (p.lotNumber !== null && p.lotNumber !== undefined) ? p.lotNumber : '—'
        ];

        for (let r = 0; r < roundsCount; r++) {
          const sc = (p.scores && p.scores[r]) || {};
          const mpVal = (sc.mp !== null && sc.mp !== undefined) ? sc.mp : '—';
          const vpVal = (sc.vp !== null && sc.vp !== undefined) ? sc.vp : '—';
          row.push(mpVal, vpVal);
        }

        row.push(
          (p.totVP !== null && p.totVP !== undefined) ? p.totVP : 0,
          (p.totMP !== null && p.totMP !== undefined) ? p.totMP : 0
        );

        if (showPrizepool) {
          row.push(prizeMap[rank] || '—');
        }

        sheetData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Unione celle per il banner del titolo e il sottotitolo
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }
      ];

      // Larghezze colonne personalizzate
      const colWidths = [
        { wch: 8 },  // Pos.
        { wch: 32 }, // Coppia / Giocatori
        { wch: 12 }  // N° Tavolo
      ];
      for (let r = 0; r < roundsCount; r++) {
        colWidths.push({ wch: 14 }, { wch: 14 }); // Turno X MP, Turno X VP
      }
      colWidths.push({ wch: 13 }, { wch: 14 }); // Totale VP, Totale MP
      if (showPrizepool) {
        colWidths.push({ wch: 15 }); // Premio (€)
      }
      ws['!cols'] = colWidths;

      // Abilita griglia visibile e filtri automatici Excel sull'intestazione
      ws['!views'] = [{ showGridLines: true }];
      if (rankedPairs.length > 0) {
        ws['!autofilter'] = {
          ref: XLSX.utils.encode_range({
            s: { r: 3, c: 0 },
            e: { r: 3 + rankedPairs.length, c: totalCols - 1 }
          })
        };
      }

      // Stile visivo: colori raffinati, font, evidenziazione podio e bordi
      try {
        const thinBorder = {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        };

        // Banner Titolo (Riga 1 - A1)
        if (ws['A1']) {
          ws['A1'].s = {
            fill: { fgColor: { rgb: '0F172A' } },
            font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }

        // Sottotitolo (Riga 2 - A2)
        if (ws['A2']) {
          ws['A2'].s = {
            fill: { fgColor: { rgb: 'F1F5F9' } },
            font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: '475569' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }

        // Intestazione Tabella (Riga 4 - indice 3)
        for (let c = 0; c < totalCols; c++) {
          const headerRef = XLSX.utils.encode_cell({ r: 3, c: c });
          if (ws[headerRef]) {
            ws[headerRef].s = {
              fill: { fgColor: { rgb: '1D4ED8' } },
              font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'medium', color: { rgb: '1E40AF' } },
                bottom: { style: 'medium', color: { rgb: '1E40AF' } },
                left: { style: 'thin', color: { rgb: '60A5FA' } },
                right: { style: 'thin', color: { rgb: '60A5FA' } }
              }
            };
          }
        }

        const colTotVpIdx = 3 + (roundsCount * 2);
        const colTotMpIdx = colTotVpIdx + 1;
        const colPrizeIdx = showPrizepool ? colTotMpIdx + 1 : -1;

        // Righe Dati Giocatori (dalla riga 5 in poi)
        for (let r = 4; r < sheetData.length; r++) {
          const rank = r - 3;
          const isEven = (r % 2 === 0);
          let rowBg = isEven ? 'F8FAFC' : 'FFFFFF';

          // Evidenziazione podio per le prime 3 coppie
          if (rank === 1) rowBg = 'FEF3C7'; // Oro chiaro
          else if (rank === 2) rowBg = 'F1F5F9'; // Argento chiaro
          else if (rank === 3) rowBg = 'FFEDD5'; // Bronzo chiaro

          for (let c = 0; c < totalCols; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            if (!ws[cellRef]) continue;

            let cellFill = rowBg;
            let fontColor = '0F172A';
            let isBold = false;
            let align = 'center';

            if (c === 1) { // Nome coppia
              align = 'left';
              if (rank <= 3) isBold = true;
            } else if (c === colTotVpIdx) { // Colonna Totale VP
              cellFill = 'EFF6FF';
              fontColor = '1D4ED8';
              isBold = true;
            } else if (c === colTotMpIdx) { // Colonna Totale MP
              cellFill = isEven ? 'F1F5F9' : 'F8FAFC';
              isBold = true;
            } else if (c === colPrizeIdx) { // Colonna Premio (€)
              if (ws[cellRef].v && ws[cellRef].v !== '—') {
                cellFill = 'ECFDF5';
                fontColor = '047857';
                isBold = true;
              }
            }

            ws[cellRef].s = {
              fill: { fgColor: { rgb: cellFill } },
              font: { name: 'Calibri', sz: 11, bold: isBold, color: { rgb: fontColor } },
              alignment: { horizontal: align, vertical: 'center' },
              border: thinBorder
            };
          }
        }

        // Altezze righe personalizzate per leggibilità
        ws['!rows'] = [
          { hpt: 26 }, // Titolo
          { hpt: 18 }, // Sottotitolo
          { hpt: 8 },  // Spaziatura
          { hpt: 24 }  // Intestazione tabella
        ];
      } catch (styleErr) {
        console.warn('Avviso: impossibile applicare alcuni stili alle celle Excel:', styleErr);
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const filePrefix = expCfg.excelFilePrefix || 'torneo';
      const safeTitle = (tournamentTitle || filePrefix).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateSuffix = (state.currentGiornataKey && state.currentGiornataKey.replace(/^serata_/, '')) || '';
      const fileName = dateSuffix ? `${safeTitle}_classifica_${dateSuffix}.xlsx` : `${safeTitle}_classifica.xlsx`;

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
    const headerNameWidth = testCtx.measureText('Giocatori').width;
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

    // Giocatori
    ctx.textAlign = 'left';
    ctx.fillText('Giocatori', tableX + colRankWidth + 14, tableY + (tableHeaderHeight / 2));

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

      // Rilevamento iOS / iPadOS (incluso iPad con Safari Desktop mode che ha MacIntel + maxTouchPoints > 1)
      const isIOS = (typeof navigator !== 'undefined') && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );

      // Su Desktop avviamo il download automatico del file PNG.
      // Su iOS / iPadOS NON usiamo a.click() con blob URL perché Safari navigherebbe verso una schermata nera.
      if (!isIOS) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
      }

      let called = false;
      const notifyDone = (copied) => {
        if (called) return;
        called = true;
        if (typeof onComplete === 'function') {
          onComplete({ success: true, blob, fileName, copiedToClipboard: copied, isIOS });
        } else if (typeof window !== 'undefined' && window.app && typeof window.app.showExportImageModal === 'function') {
          window.app.showExportImageModal({ blob, fileName, copiedToClipboard: copied, isIOS });
        }
      };

      // Su Desktop, copia contestuale negli appunti per incolla diretto su WhatsApp Web (Ctrl+V)
      if (!isIOS && typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
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
