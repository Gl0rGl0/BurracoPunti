/**
 * BURRACO - CONFIGURATION
 * File di configurazione unico e centralizzato.
 * Modifica qui il titolo, il nome del brand, le etichette e le impostazioni predefinite.
 */

const BURRACO_CONFIG = {
  // ==========================================
  // TITOLI E IDENTITÀ
  // ==========================================
  appTitle: "Burraco - Scursai Pezzo",
  brandName: "Burraco Pezzo",
  defaultTournamentTitle: "Burraco Pezzo",

  // ==========================================
  // PARAMETRI DI GARA PREDEFINITI
  // ==========================================
  defaultRounds: 4,
  minRounds: 1,
  maxRounds: 12,
  defaultByePoints: 12,

  // ==========================================
  // VISIBILITÀ INIZIALE STRUMENTI (Impostazioni)
  // ==========================================
  defaultSettings: {
    showBulkPaste: false,
    showLottery: false,
    showPodium: false,
    showPrizepool: true,
    byePoints: 12
  },

  // ==========================================
  // MONTEPREMI E PREMI CLASSIFICA
  // ==========================================
  prizepool: {
    showColumn: true,
    entryFeePerPlayer: 2,
    percentages: [50, 30, 20, 0, 0],
    columnHeader: "Premio (€)"
  },

  // ==========================================
  // ETICHETTE INTERFACCIA
  // ==========================================
  labels: {
    playersTab: "Giocatori",
    masterTab: "Classifica",
    podiumTab: "Podio",
    newEveningBtn: "Nuova Serata",
    matchPoints: "Match Points (MP)",
    victoryPoints: "Victory Points (VP)"
  },

  // ==========================================
  // ESPORTAZIONE EXCEL E STAMPA PDF
  // ==========================================
  export: {
    excelFilePrefix: "torneo",
    sheetLeaderboard: "Classifica",
    sheetMaster: "Tabellone Completo",
    headerLeaderboard: "BURRACO - CLASSIFICA GENERALE UFFICIALE",
    headerMaster: "BURRACO - TABELLONE COMPLETO DI TUTTI I TURNI",
    printSubtitle: "Classifica Finale Ufficiale",
    printRefereeSignature: "Firma Arbitro di Gara",
    printDirectorSignature: "Firma Direttore di Torneo"
  },

  // ==========================================
  // DIRECTORY E PERSISTENZA FILE (Desktop)
  // ==========================================
  storage: {
    directoryName: "BurracoPezzo",
    statsFileName: "statistiche_tornei.json"
  },
  saveDirectory: "BurracoPezzo",
  statsFileName: "statistiche_tornei.json"
};

// Esportazione per browser
if (typeof window !== 'undefined') {
  window.BURRACO_CONFIG = BURRACO_CONFIG;
}

// Esportazione per Node.js (test)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BURRACO_CONFIG;
}
