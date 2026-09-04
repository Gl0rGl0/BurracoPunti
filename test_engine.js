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
const diskJsonRaw = fs.readFileSync(path.join(__dirname, 'torneo_data.json'), 'utf8');
const diskJson = JSON.parse(diskJsonRaw);

if (!diskJson.title) {
  throw new Error('Test Fallito: titolo mancante alla radice del JSON!');
}
if (!diskJson.giornata_040926 || !Array.isArray(diskJson.giornata_040926.pairs)) {
  throw new Error('Test Fallito: blocco giornata_040926 mancante o senza pairs!');
}

console.log(`- File torneo_data.json letto con successo. Titolo: "${diskJson.title}"`);
console.log(`- Giornate presenti: ${Object.keys(diskJson).filter(k => k.startsWith('giornata_')).join(', ')}`);
console.log(`- Coppie in giornata_040926: ${diskJson.giornata_040926.pairs.length}`);

const parsedState = BurracoStorage.parseLoadedData(diskJson);
if (!parsedState || parsedState.pairs.length !== 4) {
  throw new Error('Test Fallito: parseLoadedData non ha estratto correttamente le coppie attive');
}
console.log('>>> TEST 5 SUPERATO CON SUCCESSO! Schema data GGMMAA (es. giornata_040926) e storage perfettamente conformi.');

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
console.log(`- appTitle: "${BurracoConfig.appTitle}"`);
console.log(`- brandName: "${BurracoConfig.brandName}"`);
console.log(`- defaultTournamentTitle: "${BurracoConfig.defaultTournamentTitle}"`);
console.log(`- defaultRounds: ${BurracoConfig.defaultRounds}`);
console.log(`- labels.playersTab: "${BurracoConfig.labels.playersTab}"`);
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

console.log('\n=============================================');
console.log('TUTTI I TEST MODULARI SONO PASSATI AL 100%!');
console.log('=============================================');
