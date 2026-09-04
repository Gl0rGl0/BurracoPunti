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
    const defaultTodayKey = `giornata_${utils.getDateGGMMAA()}`;
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
    const title = data.title || defaultTitle;

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

    // Search for all keys starting with giornata_
    const giornataKeys = Object.keys(data)
      .filter(k => /^giornata_/i.test(k))
      .sort((a, b) => utils.parseSortKey(a).localeCompare(utils.parseSortKey(b)));

    const allGiornate = {};

    if (giornataKeys.length > 0) {
      giornataKeys.forEach(k => {
        allGiornate[k] = data[k];
      });

      // Target active key: if data specified one and exists, use it; otherwise use last chronological
      let activeKey = data.currentGiornataKey;
      if (!activeKey || !allGiornate[activeKey]) {
        activeKey = giornataKeys[giornataKeys.length - 1];
      }

      const activeG = allGiornate[activeKey] || {};
      const pairs = Array.isArray(activeG.pairs) ? activeG.pairs : [];
      const roundsCount = activeG.roundsCount || data.roundsCount || utils.DEFAULT_ROUNDS;

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
      // Legacy format migration
      const todayKey = `giornata_${utils.getDateGGMMAA()}`;
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
      const curKey = state.currentGiornataKey || `giornata_${utils.getDateGGMMAA()}`;
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
        .filter(k => /^giornata_/i.test(k))
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
      localStorage.setItem(utils.STORAGE_KEY, JSON.stringify(localState));

      // If PyWebView API is present, persist formatted JSON directly to torneo_data.json
      if (typeof window !== 'undefined' && window.pywebview && window.pywebview.api && window.pywebview.api.save_tournament_data) {
        window.pywebview.api.save_tournament_data(prettyJson).catch(err => console.error('Python save error:', err));
      }

      return prettyJson;
    } catch (e) {
      console.error('Errore salvataggio stato:', e);
      return null;
    }
  },

  startNewEvening(state) {
    const utils = typeof window !== 'undefined' ? window.BurracoUtils : require('./utils');
    const todayKey = `giornata_${utils.getDateGGMMAA()}`;

    // 1. Ensure current active evening is saved in allGiornate
    const curKey = state.currentGiornataKey || todayKey;
    if (!state.allGiornate) state.allGiornate = {};
    state.allGiornate[curKey] = {
      roundsCount: state.roundsCount,
      pairs: JSON.parse(JSON.stringify(state.pairs))
    };

    // 2. Set new active key to today's date
    state.currentGiornataKey = todayKey;

    // 3. Clear pairs completely for a fresh start
    state.pairs = [];

    // 4. Register new evening block
    state.allGiornate[todayKey] = {
      roundsCount: state.roundsCount,
      pairs: []
    };

    this.saveState(state);
    return state;
  }
};

if (typeof window !== 'undefined') {
  window.BurracoStorage = BurracoStorage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoStorage;
}
