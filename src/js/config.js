/**
 * BURRACO - CONFIGURATION
 * File di configurazione unico e centralizzato.
 * Modifica qui il titolo, il nome del brand, le etichette e le impostazioni predefinite.
 */

const BURRACO_CONFIG = {
  // ==========================================
  // TITOLI E IDENTITÀ
  // ==========================================
  appTitle: "Burraco - Gestione Torneo",
  brandName: "Burraco",
  defaultTournamentTitle: "Torneo di Burraco",

  // ==========================================
  // PARAMETRI DI GARA PREDEFINITI
  // ==========================================
  defaultRounds: 4,
  minRounds: 1,
  maxRounds: 12,

  // ==========================================
  // VISIBILITÀ INIZIALE STRUMENTI (Impostazioni)
  // ==========================================
  defaultSettings: {
    showBulkPaste: false,
    showLottery: false,
    showPodium: false
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
  }
};

// Esportazione per browser
if (typeof window !== 'undefined') {
  window.BURRACO_CONFIG = BURRACO_CONFIG;
}

// Esportazione per Node.js (test)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BURRACO_CONFIG;
}
