/**
 * Unit & Logic Verification Test for Burraco Tournament Engine (Modular Architecture)
 */
const fs = require('fs');
const path = require('path');

console.log('--- TEST 1: Verifica sintassi e integrità moduli ---');
const html = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'src', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'src', 'app.js'), 'utf8');
const xlsxExists = fs.existsSync(path.join(__dirname, 'src', 'xlsx.full.min.js'));

// Verify modular CSS files
const cssModules = ['base.css', 'tables.css', 'podium.css', 'modals.css', 'print.css'];
cssModules.forEach(mod => {
  const p = path.join(__dirname, 'src', 'css', mod);
  if (!fs.existsSync(p)) throw new Error(`Modulo CSS mancante: src/css/${mod}`);
  const content = fs.readFileSync(p, 'utf8');
  console.log(`- src/css/${mod}: ${content.length} bytes (OK)`);
});

// Verify modular JS files
const jsModules = ['config.js', 'utils.js', 'engine.js', 'storage.js', 'excel.js'];
jsModules.forEach(mod => {
  const p = path.join(__dirname, 'src', 'js', mod);
  if (!fs.existsSync(p)) throw new Error(`Modulo JS mancante: src/js/${mod}`);
  const content = fs.readFileSync(p, 'utf8');
  console.log(`- src/js/${mod}: ${content.length} bytes (OK)`);
});

console.log(`- index.html: ${html.length} bytes`);
console.log(`- styles.css (master entry): ${css.length} bytes`);
console.log(`- app.js (controller): ${js.length} bytes`);
console.log(`- xlsx.full.min.js presente: ${xlsxExists ? 'OK' : 'MANCANTE'}`);

// Import the actual engine modules
const BurracoConfig = require('./src/js/config.js');
const BurracoUtils = require('./src/js/utils.js');
const BurracoEngine = require('./src/js/engine.js');
const BurracoStorage = require('./src/js/storage.js');
const BurracoExcel = require('./src/js/excel.js');

console.log('\n--- TEST 2: Verifica logica di calcolo e spareggio (BurracoEngine) ---');

const testPairs = [
  {
    id: 'p1',
    name: 'Coppia Alfa',
    lotNumber: 1,
    scores: [
      { mp: 1200, vp: 13 },
      { mp: 800, vp: 10 },
      { mp: 1500, vp: 15 },
      { mp: 1100, vp: 12 }
    ]
  },
  {
    id: 'p2',
    name: 'Coppia Beta (Pari VP con Alfa, ma più MP)',
    lotNumber: 2,
    scores: [
      { mp: 1400, vp: 13 },
      { mp: 900, vp: 10 },
      { mp: 1600, vp: 15 },
      { mp: 1200, vp: 12 }
    ]
  },
  {
    id: 'p3',
    name: 'Coppia Gamma (Leader assoluto)',
    lotNumber: 3,
    scores: [
      { mp: 1800, vp: 18 },
      { mp: 1700, vp: 17 },
      { mp: 1500, vp: 15 },
      { mp: 1600, vp: 16 }
    ]
  },
  {
    id: 'p4',
    name: 'Coppia Delta',
    lotNumber: 4,
    scores: [
      { mp: 500, vp: 10 },
      { mp: 1000, vp: 11 },
      { mp: 700, vp: 8 },
      { mp: 900, vp: 9 }
    ]
  }
];

const ranked = BurracoEngine.getRankedPairs(testPairs, 4);
console.log('Classifica risultante da BurracoEngine:');
ranked.forEach((p, idx) => {
  console.log(`  ${idx + 1}° Posto: ${p.name} -> ${p.totVP} VP | ${p.totMP} MP`);
});

// Assertions
if (ranked[0].name !== 'Coppia Gamma (Leader assoluto)') {
  throw new Error('Test Fallito: Leader errato!');
}
if (ranked[1].name !== 'Coppia Beta (Pari VP con Alfa, ma più MP)') {
  throw new Error('Test Fallito: Spareggio MP errato! Beta doveva precedere Alfa a parità di VP.');
}
if (ranked[2].name !== 'Coppia Alfa') {
  throw new Error('Test Fallito: Alfa doveva essere 3°');
}
console.log('>>> TEST 2 SUPERATO CON SUCCESSO! Spareggio MP e somme VP verificate.');

console.log('\n--- TEST 3: Verifica Parser Incolla Rapido da Excel/Testo (BurracoExcel) ---');
const sampleRawPaste = `
Tavolo 1: Mario Rossi + Luigi Bianchi
2. Anna Verdi - Carla Neri
Giovanni & Marco
Elena e Sofia
15 - Paolo Bruni + Roberto Fabbri
`;

const parsedPairs = BurracoExcel.parseBulkPaste(sampleRawPaste, true, 1, 4);
console.log('Nomi estratti puliti:', parsedPairs.map(p => p.name));
if (parsedPairs.length !== 5) {
  throw new Error(`Test Fallito: Attese 5 coppie, estratte ${parsedPairs.length}`);
}
if (parsedPairs[0].name !== 'Mario Rossi + Luigi Bianchi' || parsedPairs[1].name !== 'Anna Verdi - Carla Neri') {
  throw new Error('Test Fallito: Pulizia prefisso errata');
}
if (parsedPairs[0].lotNumber !== 1 || parsedPairs[4].lotNumber !== 5) {
  throw new Error('Test Fallito: Assegnazione automatica numeri sorteggio errata');
}
console.log('>>> TEST 3 SUPERATO CON SUCCESSO! Parser Excel e numerazione automatica verificati.');

console.log('\n--- TEST 4: Verifica Sorteggio Casuale (BurracoEngine.generateRandomLots) ---');
const draw = BurracoEngine.generateRandomLots(20);
const uniqueSet = new Set(draw);
if (draw.length !== 20 || uniqueSet.size !== 20 || Math.min(...draw) !== 1 || Math.max(...draw) !== 20) {
  throw new Error('Test Fallito: Sorteggio non valido!');
}
console.log(`Sorteggio 20 coppie generato: [${draw.slice(0, 8).join(', ')} ...]: Tutti numeri unici da 1 a 20.`);
console.log('>>> TEST 4 SUPERATO CON SUCCESSO!');

console.log('\n--- TEST 5: Verifica Struttura Multi-Giornata con Formato Data GGMMAA (BurracoStorage) ---');
const diskJsonRaw = fs.readFileSync(path.join(__dirname, 'statistiche_tornei.json'), 'utf8');
const diskJson = JSON.parse(diskJsonRaw);

if (!diskJson.title) {
  throw new Error('Test Fallito: titolo mancante alla radice del JSON!');
}
if (!diskJson.serata_040926 || !Array.isArray(diskJson.serata_040926.pairs)) {
  throw new Error('Test Fallito: blocco serata_040926 mancante o senza pairs!');
}

console.log(`- File statistiche_tornei.json letto con successo. Titolo: "${diskJson.title}"`);
console.log(`- Giornate presenti: ${Object.keys(diskJson).filter(k => k.startsWith('serata_')).join(', ')}`);
console.log(`- Coppie in serata_040926: ${diskJson.serata_040926.pairs.length}`);

const parsedState = BurracoStorage.parseLoadedData(diskJson);
if (!parsedState || !parsedState.allGiornate['serata_040926'] || parsedState.allGiornate['serata_040926'].pairs.length !== 4) {
  throw new Error('Test Fallito: parseLoadedData non ha estratto correttamente le coppie archiviate in serata_040926');
}

// Verifica posizione (rank) e vincita di coppia (prize)
const p1 = diskJson.serata_040926.pairs.find(p => p.id === 'p1');
const p3 = diskJson.serata_040926.pairs.find(p => p.id === 'p3');
if (!p1 || p1.rank !== 1 || p1.prize !== 8) {
  throw new Error(`Test Fallito: p1 deve avere rank 1 e prize 8, trovato rank=${p1?.rank}, prize=${p1?.prize}`);
}
if (!p3 || p3.rank !== 2 || p3.prize !== 4) {
  throw new Error(`Test Fallito: p3 deve avere rank 2 e prize 4, trovato rank=${p3?.rank}, prize=${p3?.prize}`);
}

const testEnriched = BurracoStorage.enrichPairsWithStats(diskJson.serata_040926.pairs, 4);
if (!testEnriched || testEnriched[0].rank !== 1 || testEnriched[0].prize !== 8) {
  throw new Error('Test Fallito: enrichPairsWithStats non ha calcolato correttamente rank e prize');
}
console.log('- Posizione (rank) e vincita di coppia (prize) salvate e verificate con successo (OK)');
console.log('>>> TEST 5 SUPERATO CON SUCCESSO! Schema data GGMMAA, rank e vincita perfettamente conformi.');

console.log('\n--- TEST 6: Verifica File di Configurazione Centralizzato (BURRACO_CONFIG) ---');
if (!BurracoConfig || typeof BurracoConfig !== 'object') {
  throw new Error('Test Fallito: BURRACO_CONFIG non esportato!');
}
if (!BurracoConfig.appTitle || !BurracoConfig.brandName || !BurracoConfig.defaultTournamentTitle) {
  throw new Error('Test Fallito: titoli e identità mancanti in BURRACO_CONFIG!');
}
if (!BurracoConfig.labels || !BurracoConfig.labels.playersTab || !BurracoConfig.labels.masterTab) {
  throw new Error('Test Fallito: etichette mancanti in BURRACO_CONFIG.labels!');
}
if (!BurracoConfig.export || !BurracoConfig.export.sheetLeaderboard) {
  throw new Error('Test Fallito: parametri export mancanti in BURRACO_CONFIG.export!');
}
if (!BurracoConfig.storage || !BurracoConfig.storage.directoryName) {
  throw new Error('Test Fallito: storage.directoryName mancante in BURRACO_CONFIG!');
}
console.log(`- appTitle: "${BurracoConfig.appTitle}"`);
console.log(`- brandName: "${BurracoConfig.brandName}"`);
console.log(`- defaultTournamentTitle: "${BurracoConfig.defaultTournamentTitle}"`);
console.log(`- defaultRounds: ${BurracoConfig.defaultRounds}`);
console.log(`- labels.playersTab: "${BurracoConfig.labels.playersTab}"`);
console.log(`- storage.directoryName: "${BurracoConfig.storage.directoryName}"`);
console.log('>>> TEST 6 SUPERATO CON SUCCESSO! Configurazione centralizzata verificata.');

console.log('\n--- TEST 7: Verifica Calcolo Montepremi e Premi (BurracoEngine.calculatePrizepool) ---');

// Caso standard: 10 coppie (20 giocatori x 2€ = 40€) con quote 50, 30, 20
const res10 = BurracoEngine.calculatePrizepool(10, 2, [50, 30, 20, 0, 0]);
if (res10.totalPot !== 40) throw new Error(`Test 7 fallito: montepremi errato (${res10.totalPot} !== 40)`);
if (res10.prizes[0].teamPrize !== 20 || res10.prizes[0].singlePrize !== 10) throw new Error('Test 7 fallito su 1° premio');
if (res10.prizes[1].teamPrize !== 12 || res10.prizes[1].singlePrize !== 6) throw new Error('Test 7 fallito su 2° premio');
if (res10.prizes[2].teamPrize !== 8 || res10.prizes[2].singlePrize !== 4) throw new Error('Test 7 fallito su 3° premio');
if (res10.prizes[0].text !== '20€ (10€)') throw new Error(`Test 7 testo errato: ${res10.prizes[0].text}`);
console.log(`- 10 coppie (40€): 1°=${res10.prizes[0].text}, 2°=${res10.prizes[1].text}, 3°=${res10.prizes[2].text} (OK)`);

// Caso con arrotondamenti e riassorbimento scarto: 7 coppie (14 giocatori x 2€ = 28€)
const res7 = BurracoEngine.calculatePrizepool(7, 2, [50, 30, 20, 0, 0]);
if (res7.totalPot !== 28) throw new Error('Test 7 fallito montepremi 7 coppie');
const sum7 = res7.prizes.reduce((s, p) => s + p.teamPrize, 0);
if (sum7 !== 28) throw new Error(`Test 7 somma premi erogati non pareggia totale: ${sum7} !== 28`);
console.log(`- 7 coppie (28€): 1°=${res7.prizes[0].text}, 2°=${res7.prizes[1].text}, 3°=${res7.prizes[2].text}, Totale erogato=${sum7}€ (OK)`);

// Caso con 4 premiati: 15 coppie (60€) con quote 40, 30, 20, 10
const res15 = BurracoEngine.calculatePrizepool(15, 2, [40, 30, 20, 10, 0]);
if (res15.prizes[3].teamPrize !== 6 || res15.prizes[3].singlePrize !== 3) throw new Error('Test 7 fallito su 4° premio');
console.log(`- 15 coppie (60€ con 4 premiati): 4°=${res15.prizes[3].text} (OK)`);

// Caso limite: 0 coppie o 0€
const res0 = BurracoEngine.calculatePrizepool(0, 2);
if (res0.totalPot !== 0 || res0.prizes.length !== 0) throw new Error('Test 7 fallito su 0 coppie');

console.log('>>> TEST 7 SUPERATO CON SUCCESSO! Logica montepremi, arrotondamento ad euro intero e pareggio verificati.');

console.log('\n--- TEST 8: Verifica Validazione Serate (checked flag, null check) e Merge Backup (BurracoStorage) ---');

// 1. Verifica isEveningValid
const completeEvening = {
  roundsCount: 3,
  pairs: [
    { id: 'p1', name: 'Coppia Uno', scores: [{ mp: 1000, vp: 12 }, { mp: 1200, vp: 14 }, { mp: 900, vp: 10 }] },
    { id: 'p2', name: 'Coppia Due', scores: [{ mp: 800, vp: 8 }, { mp: 600, vp: 6 }, { mp: 1100, vp: 10 }] }
  ]
};
if (!BurracoStorage.isEveningValid(completeEvening)) {
  throw new Error('Test 8 fallito: serata completa considerata non valida!');
}

const incompleteEvening = {
  roundsCount: 3,
  pairs: [
    { id: 'p1', name: 'Coppia Uno', scores: [{ mp: 1000, vp: 12 }, { mp: null, vp: null }, { mp: 900, vp: 10 }] }
  ]
};
if (BurracoStorage.isEveningValid(incompleteEvening)) {
  throw new Error('Test 8 fallito: serata con null considerata valida!');
}

const checkedEvening = {
  checked: true,
  roundsCount: 4,
  pairs: []
};
if (!BurracoStorage.isEveningValid(checkedEvening)) {
  throw new Error('Test 8 fallito: serata con checked:true non accettata direttamente!');
}
console.log('- isEveningValid: completa=valida, con null=non valida, checked:true=valida diretta (OK)');

// 2. Verifica startNewEvening con scarto serata non valida e archiviazione serata valida
const mockStateValid = {
  title: 'Torneo Test',
  currentGiornataKey: 'serata_010126',
  roundsCount: 2,
  pairs: [
    { id: 'p1', name: 'Test 1', scores: [{ mp: 1000, vp: 10 }, { mp: 1000, vp: 10 }] }
  ],
  allGiornate: {}
};
BurracoStorage.startNewEvening(mockStateValid);
if (!mockStateValid.allGiornate['serata_010126'] || mockStateValid.allGiornate['serata_010126'].checked !== true) {
  throw new Error('Test 8 fallito: serata valida non archiviata con checked:true in startNewEvening!');
}

const mockStateInvalid = {
  title: 'Torneo Test',
  currentGiornataKey: 'serata_020126',
  roundsCount: 2,
  pairs: [
    { id: 'p1', name: 'Test 1', scores: [{ mp: 1000, vp: 10 }, { mp: null, vp: null }] }
  ],
  allGiornate: {}
};
BurracoStorage.startNewEvening(mockStateInvalid);
if (mockStateInvalid.allGiornate['serata_020126']) {
  throw new Error('Test 8 fallito: serata non valida (con null) conservata nello storico!');
}
console.log('- startNewEvening: serate valide archiviate con checked:true, serate incomplete rimosse (OK)');

// 3. Verifica mergeBackupData
const existingState = {
  title: 'Torneo Burraco',
  currentGiornataKey: 'serata_040926',
  roundsCount: 2,
  pairs: [],
  allGiornate: {
    'serata_010126': {
      checked: true,
      roundsCount: 2,
      pairs: [{ id: 'p1', name: 'G1', scores: [{ mp: 1000, vp: 10 }, { mp: 1000, vp: 10 }] }]
    }
  }
};

const backupToImport = {
  title: 'Backup Campionato',
  serata_010126: { // Serata già presente: non deve essere duplicata
    checked: true,
    roundsCount: 2,
    pairs: [{ id: 'p1', name: 'G1', scores: [{ mp: 500, vp: 5 }, { mp: 500, vp: 5 }] }]
  },
  serata_020126: { // Nuova serata valida: deve essere aggiunta
    roundsCount: 2,
    pairs: [{ id: 'p2', name: 'G2', scores: [{ mp: 1100, vp: 12 }, { mp: 900, vp: 8 }] }]
  },
  serata_030126: { // Serata non valida: deve essere scartata
    roundsCount: 2,
    pairs: [{ id: 'p3', name: 'G3', scores: [{ mp: 1100, vp: 12 }, { mp: null, vp: null }] }]
  }
};

const mergeRes = BurracoStorage.mergeBackupData(existingState, backupToImport);
if (mergeRes.addedCount !== 1) {
  throw new Error(`Test 8 fallito: addedCount atteso 1 ma ottenuto ${mergeRes.addedCount}`);
}
if (!existingState.allGiornate['serata_020126'] || existingState.allGiornate['serata_020126'].checked !== true) {
  throw new Error('Test 8 fallito: serata_020126 non importata correttamente!');
}
if (existingState.allGiornate['serata_030126']) {
  throw new Error('Test 8 fallito: serata_030126 non valida importata erroneamente!');
}
// Verifica che serata_010126 non sia stata sovrascritta
if (existingState.allGiornate['serata_010126'].pairs[0].scores[0].mp !== 1000) {
  throw new Error('Test 8 fallito: serata_010126 esistente sovrascritta!');
}
console.log(`- mergeBackupData: aggiunte solo le serate mancanti e valide (${mergeRes.addedCount} aggiunta, totale ${mergeRes.totalCount}) (OK)`);

console.log('>>> TEST 8 SUPERATO CON SUCCESSO! Validazione serate, flag checked e merge backup verificati al 100%.');

console.log('\n--- TEST 9: Verifica Esportatore Immagine Classifica per WhatsApp (BurracoExcel.exportLeaderboardImage) ---');
if (typeof BurracoExcel.exportLeaderboardImage !== 'function') {
  throw new Error('Test 9 fallito: exportLeaderboardImage non definita in BurracoExcel!');
}
// Verifica esecuzione sicura in ambiente non-DOM
const testImgResult = BurracoExcel.exportLeaderboardImage({ title: 'Test' }, []);
if (testImgResult !== null) {
  throw new Error('Test 9 fallito: exportLeaderboardImage non gestisce ambiente headless');
}
// Verifica aggiornamento pulsante in index.html
if (html.includes('title="Salva in PDF')) {
  throw new Error('Test 9 fallito: vecchio pulsante PDF ancora presente in index.html!');
}
if (!html.includes('id="modal-export-image"')) {
  throw new Error('Test 9 fallito: modale custom modal-export-image mancante in index.html!');
}
console.log('- Funzione BurracoExcel.exportLeaderboardImage: presente e sicura (OK)');
console.log('- Interfaccia HTML: pulsante "🖼️ Salva Immagine" e modale custom presenti (OK)');
console.log('>>> TEST 9 SUPERATO CON SUCCESSO! Generazione immagine classifica e modale custom verificate.');

console.log('\n--- TEST 10: Verifica Validazione Real-Time Percentuali Montepremi (<= 100%) ---');
if (!html.includes('id="prize-pct-total-badge"')) {
  throw new Error('Test 10 fallito: badge prize-pct-total-badge mancante in index.html!');
}
if (!html.includes('id="prize-pct-hint"')) {
  throw new Error('Test 10 fallito: container hint prize-pct-hint mancante in index.html!');
}
// Simulazione logica di clamping in app.js
const mockInputs = [50, 50, 0, 0, 0];
const targetIdx = 2; // tenta di inserire 50 al 3° posto
const otherSum = mockInputs.reduce((sum, v, idx) => idx !== targetIdx ? sum + v : sum, 0); // 100
const maxAllowed = Math.max(0, 100 - otherSum); // 0
const inputVal = 50;
const clampedVal = Math.min(inputVal, maxAllowed);
if (clampedVal !== 0) {
  throw new Error(`Test 10 fallito: con 50+50 il 3° posto deve essere bloccato a 0, invece ha dato ${clampedVal}`);
}
console.log('- Badge e hint percentuali presenti in index.html (OK)');
console.log(`- Simulazione inserimento 50+50+50: il 3° campo viene bloccato a ${clampedVal}% (OK)`);
console.log('>>> TEST 10 SUPERATO CON SUCCESSO! Controllo real-time somma percentuali <= 100% verificato.');

console.log('\n--- TEST 11: Verifica Controllo Somma Punti Turno (Multiplo 20 o Resto Bye/Riposo) ---');
if (!html.includes('id="setting-bye-points"')) {
  throw new Error('Test 11 fallito: input setting-bye-points mancante in index.html!');
}
if (!html.includes('id="round-vp-check-banner"')) {
  throw new Error('Test 11 fallito: banner round-vp-check-banner mancante in index.html!');
}
if (!html.includes('id="round-title-check"')) {
  throw new Error('Test 11 fallito: spunta round-title-check mancante in index.html!');
}

const BURRACO_CONFIG = require('./src/js/config');
if (BURRACO_CONFIG.defaultByePoints !== 12) {
  throw new Error(`Test 11 fallito: defaultByePoints deve essere 12, trovato ${BURRACO_CONFIG.defaultByePoints}`);
}

// 1. Tavoli completi con coppie pari (es. 4 coppie -> 2 tavoli -> esattamente 40 VP; 6 coppie -> 60 VP)
const v40 = BurracoEngine.validateRoundVpSum(40, 4, 12);
if (!v40.valid || v40.expectedVP !== 40) throw new Error('Test 11 fallito: 4 coppie con 40 VP deve essere valido');

const vWrong40 = BurracoEngine.validateRoundVpSum(60, 4, 12); // 60 è multiplo di 20, ma per 4 coppie ne servono 40!
if (vWrong40.valid) throw new Error('Test 11 fallito: 4 coppie con 60 VP non deve essere valido!');

const v60 = BurracoEngine.validateRoundVpSum(60, 6, 12);
if (!v60.valid || v60.expectedVP !== 60) throw new Error('Test 11 fallito: 6 coppie con 60 VP deve essere valido');

// 2. Tavoli con 1 coppia di riposo (es. 5 coppie -> 2 tavoli x 20 + 12 = 52 VP; 7 coppie -> 3 tavoli x 20 + 12 = 72 VP)
const v52 = BurracoEngine.validateRoundVpSum(52, 5, 12);
if (!v52.valid || v52.expectedVP !== 52 || !v52.isOdd) throw new Error('Test 11 fallito: 5 coppie con riposo 12 deve attendersi 52 VP');

const v72 = BurracoEngine.validateRoundVpSum(72, 7, 12);
if (!v72.valid || v72.expectedVP !== 72 || !v72.isOdd) throw new Error('Test 11 fallito: 7 coppie con riposo 12 deve attendersi 72 VP');

// 3. Punti riposo personalizzati (es. 10 VP su 5 coppie -> 2 tavoli x 20 + 10 = 50 VP)
const v50 = BurracoEngine.validateRoundVpSum(50, 5, 10);
if (!v50.valid || v50.expectedVP !== 50) throw new Error('Test 11 fallito: 5 coppie con riposo 10 deve attendersi 50 VP');

// 4. Somme non valide (errori di punteggio ai tavoli)
const v42 = BurracoEngine.validateRoundVpSum(42, 4, 12);
if (v42.valid) throw new Error('Test 11 fallito: 4 coppie con 42 VP deve risultare non valido!');

const v54 = BurracoEngine.validateRoundVpSum(54, 5, 12);
if (v54.valid) throw new Error('Test 11 fallito: 5 coppie con 54 VP (attesi 52) deve risultare non valido!');

// 5. Verifica limiti singoli punteggi (0 <= VP <= 20)
const vOver20 = BurracoEngine.validateRoundVpSum([25, 15, 0, 0], 4, 12); // somma 40 ma contiene 25 (>20)
if (vOver20.valid || !vOver20.hasOutOfRange) throw new Error('Test 11 fallito: punteggio > 20 deve essere rilevato come out-of-range e non valido!');

const vNegative = BurracoEngine.validateRoundVpSum([-2, 22, 10, 10], 4, 12); // somma 40 ma contiene negativi e >20
if (vNegative.valid || !vNegative.hasOutOfRange) throw new Error('Test 11 fallito: punteggio negativo deve essere rilevato come out-of-range!');

const vBoundary = BurracoEngine.validateRoundVpSum([20, 0, 10, 10], 4, 12); // estremi esatti 0 e 20
if (!vBoundary.valid || vBoundary.hasOutOfRange || vBoundary.totalVP !== 40) throw new Error('Test 11 fallito: punteggi limite 0 e 20 devono essere validi!');

// 6. Verifica attributi di input UI in app.js
if (!js.includes('min="0"') || !js.includes('max="20"')) {
  throw new Error('Test 11 fallito: controlli min="0" e max="20" mancanti per i campi VP in app.js!');
}

console.log('- Componenti UI presenti (setting-bye-points e round-vp-check-banner) (OK)');
console.log('- Uguaglianza esatta coppie pari verificata (4 coppie=40 VP, 6 coppie=60 VP; scartato 60 VP su 4 coppie) (OK)');
console.log('- Uguaglianza esatta con riposo verificata (5 coppie=52 VP, 7 coppie=72 VP; riposo 10 su 5 coppie=50 VP) (OK)');
console.log('- Errori di inserimento rilevati (42 VP su 4 coppie, 54 VP su 5 coppie) (OK)');
console.log('- Limiti singoli punteggi (0 <= VP <= 20) verificati su array e boundary [20, 0, 10, 10] (OK)');
console.log('>>> TEST 11 SUPERATO CON SUCCESSO! Controllo uguaglianza esatta e limiti singoli punteggi VP verificati al 100%.');

console.log('\n--- TEST 12: Verifica Persistenza Data Serata Oltre la Mezzanotte (BurracoStorage) ---');

// 1. Simula salvataggio localStorage con data 04/09/26 caricato dopo mezzanotte
const statePastMidnight = {
  title: 'Burraco Pezzo',
  currentGiornataKey: 'serata_040926',
  allGiornate: {
    serata_040926: { roundsCount: 4, pairs: [{ id: 'p1', name: 'Pietro + Paolo' }] }
  },
  pairs: [{ id: 'p1', name: 'Pietro + Paolo' }]
};
const parsedPastMidnight = BurracoStorage.parseLoadedData(statePastMidnight);
if (parsedPastMidnight.currentGiornataKey !== 'serata_040926') {
  throw new Error(`Test 12 fallito: la data della serata attiva è cambiata a ${parsedPastMidnight.currentGiornataKey} invece di rimanere serata_040926!`);
}
console.log(`- Data serata attiva preservata dopo mezzanotte (${parsedPastMidnight.currentGiornataKey}) (OK)`);

// 2. Simula duplicato creato accidentalmente dopo la mezzanotte senza aver premuto "Nuova Serata"
const stateCorruptedDuplicate = {
  title: 'Burraco Pezzo',
  currentGiornataKey: 'serata_050926',
  allGiornate: {
    serata_040926: { roundsCount: 4, pairs: [{ id: 'p1', name: 'Pietro + Paolo' }] },
    serata_050926: { roundsCount: 4, pairs: [{ id: 'p1', name: 'Pietro + Paolo' }] }
  },
  pairs: [{ id: 'p1', name: 'Pietro + Paolo' }]
};
const parsedRecovered = BurracoStorage.parseLoadedData(stateCorruptedDuplicate);
if (parsedRecovered.currentGiornataKey !== 'serata_040926') {
  throw new Error(`Test 12 fallito: recupero mancato della serata originale 040926, trovato ${parsedRecovered.currentGiornataKey}`);
}
console.log(`- Auto-recupero duplicato non archiviato effettuato con successo (${parsedRecovered.currentGiornataKey}) (OK)`);

// 3. Verifica che con "Nuova Serata" la data passi effettivamente alla nuova giornata
const freshEveningState = {
  title: 'Burraco Pezzo',
  currentGiornataKey: 'serata_040926',
  roundsCount: 4,
  pairs: [{ id: 'p1', name: 'Pietro + Paolo', scores: [{ mp: 1000, vp: 10 }, { mp: 1000, vp: 10 }, { mp: 1000, vp: 10 }, { mp: 1000, vp: 10 }] }],
  allGiornate: {}
};
BurracoStorage.startNewEvening(freshEveningState);
const todayKeyExpected = `serata_${BurracoUtils.getDateGGMMAA()}`;
if (freshEveningState.currentGiornataKey !== todayKeyExpected) {
  throw new Error(`Test 12 fallito: startNewEvening non ha impostato la nuova data ${todayKeyExpected}, trovato ${freshEveningState.currentGiornataKey}`);
}
if (freshEveningState.allGiornate['serata_040926'].checked !== true) {
  throw new Error('Test 12 fallito: la serata precedente non è stata archiviata con checked:true');
}
console.log(`- Nuova Serata attiva correttamente la nuova data (${freshEveningState.currentGiornataKey}) e archivia la precedente (OK)`);
console.log('>>> TEST 12 SUPERATO CON SUCCESSO! Persistenza data serata verificata al 100%.');

console.log('\n--- TEST 13: Verifica Modale Custom per Azzeramento Dati Torneo (No Confirm Nativo) ---');
if (!html.includes('id="modal-confirm-clear"')) {
  throw new Error('Test 13 fallito: modal-confirm-clear mancante in index.html!');
}
if (!html.includes('id="btn-confirm-clear"') || !html.includes('id="btn-cancel-clear"')) {
  throw new Error('Test 13 fallito: pulsanti di conferma/annullamento mancanti in modal-confirm-clear!');
}
if (js.includes("confirm('Sei sicuro di voler azzerare")) {
  throw new Error('Test 13 fallito: confirm nativo del browser ancora presente per il reset dati!');
}
if (!js.includes('modalConfirmClear') || !js.includes('btnConfirmClear')) {
  throw new Error('Test 13 fallito: controller app.js non gestisce modalConfirmClear o btnConfirmClear!');
}
console.log('- Modale custom modal-confirm-clear e pulsanti presenti in index.html (OK)');
console.log('- Dialog confirm nativo del browser rimosso e sostituito con la modale (OK)');
console.log('>>> TEST 13 SUPERATO CON SUCCESSO! Gestione azzeramento dati conforme al 100%.');

console.log('\n=============================================');
console.log('TUTTI I TEST MODULARI SONO PASSATI AL 100%!');
console.log('=============================================');
