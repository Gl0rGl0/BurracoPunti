/**
 * BURRACO - TOURNAMENT PERSISTENCE & STORAGE MANAGER
 * Multi-day tournament state management, localStorage sync, and PyWebView disk bridge.
 */

const BurracoStorage = {
  _getConfig() {
    if (typeof window !== 'undefined' && window.BURRACO_CONFIG) return window.BURRACO_CONFIG;
    try { return require('./config'); } catch(e) { return {}; }
  },

  getDefaultState() {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    const cfg = this._getConfig();
    const defaultTodayKey = `serata_${utils.getDateGGMMAA()}`;
    const defaultRounds = utils.DEFAULT_ROUNDS || cfg.defaultRounds || 4;
    const defaultTitle = cfg.defaultTournamentTitle || 'Torneo di Burraco';
    const defaultSettings = cfg.defaultSettings || { showBulkPaste: false, showLottery: false, showPodium: false };

    return {
      title: defaultTitle,
      currentGiornataKey: defaultTodayKey,
      allGiornate: {
        [defaultTodayKey]: {
          roundsCount: defaultRounds,
          pairs: [
            { id: 'p1', lotNumber: 1, name: 'Pietro - Paolo', scores: [{ mp: 1540, vp: 14 }, { mp: 980, vp: 11 }, { mp: 1200, vp: 13 }, { mp: null, vp: null }] },
            { id: 'p2', lotNumber: 2, name: 'Anna - Marco', scores: [{ mp: 620, vp: 6 }, { mp: 1420, vp: 16 }, { mp: 850, vp: 9 }, { mp: null, vp: null }] },
            { id: 'p3', lotNumber: 3, name: 'Giovanni - Luca', scores: [{ mp: 1810, vp: 17 }, { mp: 750, vp: 8 }, { mp: 1650, vp: 15 }, { mp: null, vp: null }] },
            { id: 'p4', lotNumber: 4, name: 'Maria - Elena', scores: [{ mp: 890, vp: 9 }, { mp: 1310, vp: 14 }, { mp: 1100, vp: 12 }, { mp: null, vp: null }] }
          ]
        }
      },
      roundsCount: defaultRounds,
      settings: { ...defaultSettings },
      currentTab: 'initial', // 'initial' | 'round' | 'master' | 'podium'
      activeRoundIndex: 0,
      searchFilter: '',
      initialSearchFilter: '',
      pairs: [
        { id: 'p1', lotNumber: 1, name: 'Pietro - Paolo', scores: [{ mp: 1540, vp: 14 }, { mp: 980, vp: 11 }, { mp: 1200, vp: 13 }, { mp: null, vp: null }] },
        { id: 'p2', lotNumber: 2, name: 'Anna - Marco', scores: [{ mp: 620, vp: 6 }, { mp: 1420, vp: 16 }, { mp: 850, vp: 9 }, { mp: null, vp: null }] },
        { id: 'p3', lotNumber: 3, name: 'Giovanni - Luca', scores: [{ mp: 1810, vp: 17 }, { mp: 750, vp: 8 }, { mp: 1650, vp: 15 }, { mp: null, vp: null }] },
        { id: 'p4', lotNumber: 4, name: 'Maria - Elena', scores: [{ mp: 890, vp: 9 }, { mp: 1310, vp: 14 }, { mp: 1100, vp: 12 }, { mp: null, vp: null }] }
      ]
    };
  },

  parseLoadedData(data) {
    if (!data || typeof data !== 'object') return null;

    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    const cfg = this._getConfig();
    const defaultTitle = cfg.defaultTournamentTitle || 'Torneo di Burraco';
    const title = (!data.title || data.title === 'Torneo di Burraco') ? defaultTitle : data.title;

    // Retrieve existing settings from localStorage if data doesn't provide them
    let savedSettings = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(utils.STORAGE_KEY);
        if (local) {
          const parsedLocal = JSON.parse(local);
          if (parsedLocal && parsedLocal.settings) savedSettings = parsedLocal.settings;
        }
      }
    } catch (e) {}

    const defaultSettings = cfg.defaultSettings || { showBulkPaste: false, showLottery: false, showPodium: false };
    const settings = {
      ...defaultSettings,
      ...(savedSettings || {}),
      ...(data.settings || {})
    };

    // Search for all keys starting with serata_ at root level OR inside allGiornate
    const candidateKeys = new Set([
      ...Object.keys(data).filter(k => /^serata_/i.test(k)),
      ...(data.allGiornate && typeof data.allGiornate === 'object'
        ? Object.keys(data.allGiornate).filter(k => /^serata_/i.test(k))
        : [])
    ]);

    if (data.currentGiornataKey && /^serata_/i.test(data.currentGiornataKey)) {
      candidateKeys.add(data.currentGiornataKey);
    }

    const allGiornate = {};
    candidateKeys.forEach(k => {
      allGiornate[k] = data[k] || (data.allGiornate && data.allGiornate[k]) || {};
    });

    const giornataKeys = Array.from(candidateKeys)
      .sort((a, b) => utils.parseSortKey(a).localeCompare(utils.parseSortKey(b)));

    // Se per effetto del cambio data a mezzanotte è stata creata una chiave duplicata non archiviata
    if (giornataKeys.length > 1) {
      const lastKey = giornataKeys[giornataKeys.length - 1];
      const prevKey = giornataKeys[giornataKeys.length - 2];
      const lastG = allGiornate[lastKey];
      const prevG = allGiornate[prevKey];
      if (prevG && prevG.checked !== true && lastG && lastG.checked !== true) {
        delete allGiornate[lastKey];
        candidateKeys.delete(lastKey);
        giornataKeys.pop();
        if (data.currentGiornataKey === lastKey) {
          data.currentGiornataKey = prevKey;
        }
      }
    }

    if (giornataKeys.length > 0) {
      // Target active key: if data specified one and exists, use it; otherwise use last chronological
      let activeKey = data.currentGiornataKey;
      if (!activeKey || !allGiornate[activeKey]) {
        activeKey = giornataKeys[giornataKeys.length - 1];
      }

      const activeG = allGiornate[activeKey] || {};
      const pairs = (Array.isArray(data.pairs) && data.pairs.length > 0)
        ? data.pairs
        : (Array.isArray(activeG.pairs) ? activeG.pairs : []);
      const roundsCount = activeG.roundsCount || data.roundsCount || utils.DEFAULT_ROUNDS;

      if (!activeG.pairs) activeG.pairs = pairs;
      if (!activeG.roundsCount) activeG.roundsCount = roundsCount;
      allGiornate[activeKey] = activeG;

      return {
        title,
        settings,
        currentGiornataKey: activeKey,
        allGiornate,
        roundsCount,
        pairs,
        currentTab: data.currentTab || 'initial',
        activeRoundIndex: data.activeRoundIndex || 0,
        searchFilter: '',
        initialSearchFilter: ''
      };
    } else if (Array.isArray(data.pairs)) {
      // Legacy format migration: preserve data.currentGiornataKey if already set
      const todayKey = data.currentGiornataKey || `serata_${utils.getDateGGMMAA()}`;
      const roundsCount = data.roundsCount || utils.DEFAULT_ROUNDS;
      allGiornate[todayKey] = {
        roundsCount,
        pairs: data.pairs
      };
      return {
        title,
        settings,
        currentGiornataKey: todayKey,
        allGiornate,
        roundsCount,
        pairs: data.pairs,
        currentTab: data.currentTab || 'initial',
        activeRoundIndex: data.activeRoundIndex || 0,
        searchFilter: '',
        initialSearchFilter: ''
      };
    }

    return null;
  },

  loadState() {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    try {
      const saved = localStorage.getItem(utils.STORAGE_KEY) || localStorage.getItem('burraco_Pezzo_tournament_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const state = this.parseLoadedData(parsed);
        if (state) return state;
      }
    } catch (e) {
      console.warn('Errore lettura localStorage:', e);
    }
    return this.getDefaultState();
  },

  saveState(state) {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    try {
      if (!state.allGiornate) {
        state.allGiornate = {};
      }
      const curKey = state.currentGiornataKey || `serata_${utils.getDateGGMMAA()}`;
      state.currentGiornataKey = curKey;
      state.allGiornate[curKey] = {
        roundsCount: state.roundsCount,
        pairs: state.pairs
      };

      // File structure: "title" is the only unique root key, followed by incremental date blocks
      const fileData = {
        title: state.title
      };

      const sortedKeys = Object.keys(state.allGiornate)
        .filter(k => /^serata_/i.test(k))
        .sort((a, b) => utils.parseSortKey(a).localeCompare(utils.parseSortKey(b)));

      sortedKeys.forEach(k => {
        fileData[k] = state.allGiornate[k];
      });

      // Indented incremental JSON structure
      const prettyJson = JSON.stringify(fileData, null, 2);

      // In localStorage save current full state for fast browser resumption
      const localState = {
        ...state,
        allGiornate: state.allGiornate
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(utils.STORAGE_KEY, JSON.stringify(localState));
      }

      // If PyWebView API is present, persist formatted JSON directly to statistiche_tornei.json
      if (typeof window !== 'undefined' && window.pywebview && window.pywebview.api && window.pywebview.api.save_tournament_data) {
        window.pywebview.api.save_tournament_data(prettyJson).catch(err => console.error('Python save error:', err));
      }

      return prettyJson;
    } catch (e) {
      console.error('Errore salvataggio stato:', e);
      return null;
    }
  },

  isEveningValid(evening) {
    if (!evening || typeof evening !== 'object') return false;
    // Se già contrassegnata come verificata, non ripete i controlli
    if (evening.checked === true) return true;

    const roundsCount = parseInt(evening.roundsCount, 10);
    if (!roundsCount || roundsCount < 1) return false;
    if (!Array.isArray(evening.pairs)) return false;

    // Filtra coppie valide con nome non vuoto
    const validPairs = evening.pairs.filter(p => p && p.name && p.name.trim() !== '');
    if (validPairs.length === 0) return false;

    // Ciascuna coppia deve avere punteggi validi e non null per tutti i turni
    for (const pair of validPairs) {
      if (!Array.isArray(pair.scores)) return false;
      for (let r = 0; r < roundsCount; r++) {
        const sc = pair.scores[r];
        if (!sc || typeof sc !== 'object') return false;
        if (sc.mp === null || sc.mp === undefined || isNaN(Number(sc.mp))) return false;
        if (sc.vp === null || sc.vp === undefined || isNaN(Number(sc.vp))) return false;
      }
    }

    return true;
  },

  cleanInvalidEvenings(allGiornate, activeKey = null) {
    if (!allGiornate || typeof allGiornate !== 'object') return;
    Object.keys(allGiornate).forEach(key => {
      if (activeKey && key === activeKey) return;
      if (/^serata_/i.test(key)) {
        const ev = allGiornate[key];
        if (this.isEveningValid(ev)) {
          ev.checked = true;
        } else {
          delete allGiornate[key];
        }
      }
    });
  },

  startNewEvening(state) {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    const todayKey = `serata_${utils.getDateGGMMAA()}`;
    const curKey = state.currentGiornataKey || todayKey;

    if (!state.allGiornate) state.allGiornate = {};

    // 1. Verifica validità della serata corrente prima di archiviarla
    const candidateCur = {
      roundsCount: state.roundsCount,
      pairs: JSON.parse(JSON.stringify(state.pairs || []))
    };

    if (this.isEveningValid(candidateCur)) {
      candidateCur.checked = true;
      state.allGiornate[curKey] = candidateCur;
    } else {
      // Se non valida (es. incompleta o vuota), viene rimossa dallo storico per non sprecare spazio
      delete state.allGiornate[curKey];
    }

    // 2. Pulizia di eventuali serate storiche pregresse non valide
    this.cleanInvalidEvenings(state.allGiornate, null);

    // 3. Nuova serata per oggi
    state.currentGiornataKey = todayKey;
    state.pairs = [];
    state.allGiornate[todayKey] = {
      roundsCount: state.roundsCount,
      pairs: []
    };

    this.saveState(state);
    return state;
  },

  mergeBackupData(currentState, importedData) {
    if (!importedData || typeof importedData !== 'object') {
      return { success: false, addedCount: 0, totalCount: 0, error: 'Dati non validi' };
    }

    if (!currentState.allGiornate) currentState.allGiornate = {};

    // Estrae tutte le serate presenti nel file importato
    const importedEvenings = {};
    Object.keys(importedData).forEach(k => {
      if (/^serata_/i.test(k) && typeof importedData[k] === 'object' && importedData[k] !== null) {
        importedEvenings[k] = importedData[k];
      }
    });

    if (importedData.allGiornate && typeof importedData.allGiornate === 'object') {
      Object.keys(importedData.allGiornate).forEach(k => {
        if (/^serata_/i.test(k) && typeof importedData.allGiornate[k] === 'object' && importedData.allGiornate[k] !== null) {
          importedEvenings[k] = importedData.allGiornate[k];
        }
      });
    }

    // Compatibilità legacy se presente solo pairs alla radice
    if (Object.keys(importedEvenings).length === 0 && Array.isArray(importedData.pairs)) {
      const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
      const legKey = `serata_${utils.getDateGGMMAA()}`;
      importedEvenings[legKey] = {
        roundsCount: importedData.roundsCount || 4,
        pairs: importedData.pairs
      };
    }

    let addedCount = 0;
    Object.keys(importedEvenings).forEach(k => {
      const ev = importedEvenings[k];
      // Aggiunge solo serate non ancora presenti che siano valide
      if (!currentState.allGiornate[k]) {
        if (this.isEveningValid(ev)) {
          ev.checked = true;
          currentState.allGiornate[k] = JSON.parse(JSON.stringify(ev));
          addedCount++;
        }
      }
    });

    const totalCount = Object.keys(currentState.allGiornate).filter(k => /^serata_/i.test(k)).length;
    this.saveState(currentState);

    return {
      success: true,
      addedCount,
      totalCount
    };
  }
};

if (typeof window !== 'undefined') {
  window.BurracoStorage = BurracoStorage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoStorage;
}
